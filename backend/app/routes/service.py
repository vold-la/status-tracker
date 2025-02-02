from flask import Blueprint, request, jsonify, abort, flash
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Service, db, User, StatusHistory, EmailSubscriber
from flask_socketio import emit
from app import socketio, mail
from flask_mail import Message
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

service_bp = Blueprint('service', __name__)

def admin_required(fn):
    """Decorator to ensure the user is an admin"""
    @jwt_required()
    def wrapper(*args, **kwargs):
        current_user_email = get_jwt_identity()
        user = User.query.filter_by(email=current_user_email).first()
        if not user or 'admin' not in [role.name for role in user.roles]:
            return {"error": "Admin access required"}, 403
        return fn(*args, **kwargs)
    wrapper.__name__ = fn.__name__ 
    return wrapper

def validate_service_data(data):
    if not data.get('name'):
        raise ValueError("Service name is required")
    if not data.get('organization_id'):
        raise ValueError("Organization ID is required")
    if 'status' in data:
        Service.validate_status(data['status'])
    return True

def notify_subscribers(service, new_status):
    """Send email notifications to all verified subscribers"""
    try:
        subscribers = EmailSubscriber.query.filter_by(is_verified=True).all()
        logger.info(f"Sending status update notifications for service {service.name} to {len(subscribers)} subscribers")
        
        if not subscribers:
            logger.info("No verified subscribers found")
            return
        
        msg = Message(
            subject=f"Service Status Update: {service.name}",
            recipients=[s.email for s in subscribers]
        )
        
        msg.html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #f8f9fa; padding: 20px; border-bottom: 3px solid #dee2e6; }}
                .content {{ padding: 20px; }}
                .status {{ font-weight: bold; padding: 8px 16px; border-radius: 4px; display: inline-block; }}
                .footer {{ margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2 style="margin: 0; color: #212529;">Service Status Update</h2>
                </div>
                <div class="content">
                    <p>Hello,</p>
                    <p>We're writing to inform you that the status of <strong>{service.name}</strong> has been updated.</p>
                    <p>
                        Current Status: 
                        <span class="status" style="background-color: {
                            '#2FB344' if new_status == 'Operational'
                            else '#DE9B3A' if new_status == 'Degraded'
                            else '#DC3545'
                        }; color: white;">
                            {new_status}
                        </span>
                    </p>
                    <p>This status update was recorded at {datetime.utcnow().strftime('%B %d, %Y %H:%M:%S UTC')}.</p>
                    <p>You can view more details about this service's status by visiting our status page.</p>
                </div>
                <div class="footer">
                    <p>This is an automated message. Please do not reply to this email.</p>
                    <p>You're receiving this because you subscribed to status updates. 
                       To unsubscribe, please visit our status page.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        mail.send(msg)
        logger.info(f"Successfully sent status update notifications for service {service.name}")
    except Exception as e:
        logger.error(f"Failed to send notification emails: {str(e)}")

@service_bp.route('/api/services', methods=['GET'], endpoint='manage_services')
@jwt_required()
@admin_required
def manage_services():
    try:
        if request.method == 'GET':
            services = Service.query.all()
            return jsonify([{
                'id': s.id,
                'name': s.name,
                'status': s.status,
                'organization_id': s.organization_id,
                'created_at': s.created_at.isoformat(),
                'updated_at': s.updated_at.isoformat()
            } for s in services]), 200
            
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

@service_bp.route('/api/services', methods=['POST'])
@jwt_required()
@admin_required
def create_service():
    try:
        data = request.json
        validate_service_data(data)
        
        new_service = Service(
            name=data['name'],
            status=data.get('status', 'Operational'),
            organization_id=data['organization_id']
        )
        
        db.session.add(new_service)
        db.session.commit()
        
        flash('Service created successfully', 'success')
        return jsonify(new_service.to_dict()), 201
        
    except ValueError as e:
        flash(str(e), 'error')
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        flash('Failed to create service', 'error')
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

@service_bp.route('/api/services/<int:service_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
@admin_required 
def service_detail(service_id):
    
    try:
        service = Service.query.get_or_404(service_id)

        if request.method == 'GET':
            logger.info(f"Retrieved service details for ID: {service_id}")
            return jsonify(service.to_dict()), 200
            
        elif request.method == 'PUT':
            data = request.json
            Service.validate_status(data.get('status'))
            
            if 'name' in data:
                old_name = service.name
                service.name = data['name']
                logger.info(f"Service name changed from '{old_name}' to '{data['name']}' (ID: {service_id})")
                
            if 'status' in data and data['status'] != service.status:
                old_status = service.status
                history = StatusHistory(
                    service_id=service.id,
                    status=data['status']
                )
                db.session.add(history)
                
                service.status = data['status']
                logger.warning(f"Service status changed from '{old_status}' to '{data['status']}' for {service.name} (ID: {service_id})")
                
                db.session.commit()
                notify_subscribers(service, data['status'])
                
                socketio.emit('service_status_changed', {
                    'service_id': service.id,
                    'name': service.name,
                    'status': service.status,
                    'old_status': old_status
                }, room=None)
                
                return jsonify(service.to_dict()), 200
            
            db.session.commit()
            return jsonify(service.to_dict()), 200
            
        elif request.method == 'DELETE':
            logger.warning(f"Deleting service: {service.name} (ID: {service_id})")
            db.session.delete(service)
            db.session.commit()
            return '', 204
            
    except ValueError as e:
        logger.warning(f"Invalid service data for ID {service_id}: {str(e)}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Error processing service {service_id}: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

@service_bp.route('/api/services/<int:service_id>/history')
@jwt_required()
@admin_required
def get_service_history(service_id):
    history = StatusHistory.query.filter_by(service_id=service_id)\
        .order_by(StatusHistory.timestamp.desc())\
        .limit(30)\
        .all()
    return jsonify([h.to_dict() for h in history])

@service_bp.route('/api/services/<int:service_id>/uptime', methods=['GET'])
def get_service_uptime(service_id):
    try:
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        history = StatusHistory.query.filter(
            StatusHistory.service_id == service_id,
            StatusHistory.timestamp >= thirty_days_ago
        ).order_by(StatusHistory.timestamp.asc()).all()
        
        return jsonify([h.to_dict() for h in history])
    except Exception as e:
        return jsonify({'error': str(e)}), 500