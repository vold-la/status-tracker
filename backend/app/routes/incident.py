from flask import Blueprint, request, jsonify, abort, flash
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import db, Incident, Service, User
from datetime import datetime

incident_bp = Blueprint('incident', __name__)

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

def validate_incident_data(data):
    """Validate incident data before processing"""
    required_fields = ['service_id', 'description', 'status']
    if not all(field in data for field in required_fields):
        raise ValueError("Missing required fields")
    
    try:
        Incident.validate_status(data['status'])
    except ValueError as e:
        raise ValueError(f"Invalid status: {str(e)}")
    
    service = Service.query.get(data['service_id'])
    if not service:
        raise ValueError("Invalid service_id")
    
    return True

def get_incident_or_404(incident_id):
    """Get incident by ID or raise 404"""
    incident = Incident.query.get(incident_id)
    if not incident:
        abort(404, description="Incident not found")
    return incident

@incident_bp.route('/api/incidents', methods=['GET', 'POST'], endpoint='manage_incidents')
@jwt_required()
@admin_required
def manage_incidents():
    try:
        if request.method == 'GET':
            incidents = Incident.query.all()
            return jsonify([{
                'id': i.id,
                'service_id': i.service_id,
                'status': i.status,
                'description': i.description,
                'resolved': i.resolved,
                'created_at': i.created_at.isoformat(),
                'updated_at': i.updated_at.isoformat()
            } for i in incidents]), 200

        elif request.method == 'POST':
            data = request.json
            validate_incident_data(data)
            
            new_incident = Incident(
                service_id=data['service_id'],
                status=data['status'],
                description=data['description'],
                resolved=data.get('resolved', False)
            )
            
            db.session.add(new_incident)
            db.session.commit()
            
            flash('Incident created successfully', 'success')
            return jsonify(new_incident.to_dict()), 201

    except ValueError as e:
        flash(str(e), 'error')
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        flash('Failed to create incident', 'error')
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

@incident_bp.route('/api/incidents/<int:incident_id>', methods=['GET', 'PUT', 'DELETE'], endpoint='incident_detail')
@jwt_required()
@admin_required
def incident_detail(incident_id):
    try:
        incident = get_incident_or_404(incident_id)

        if request.method == 'GET':
            return jsonify({
                'id': incident.id,
                'service_id': incident.service_id,
                'status': incident.status,
                'description': incident.description,
                'resolved': incident.resolved,
                'created_at': incident.created_at.isoformat(),
                'updated_at': incident.updated_at.isoformat()
            }), 200

        elif request.method == 'PUT':
            data = request.json
            
            if 'status' in data:
                Incident.validate_status(data['status'])
                incident.status = data['status']
            
            if 'description' in data:
                incident.description = data['description']
            
            if 'resolved' in data:
                incident.resolved = bool(data['resolved'])
            
            incident.updated_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({
                'id': incident.id,
                'service_id': incident.service_id,
                'status': incident.status,
                'description': incident.description,
                'resolved': incident.resolved,
                'created_at': incident.created_at.isoformat(),
                'updated_at': incident.updated_at.isoformat()
            }), 200

        elif request.method == 'DELETE':
            db.session.delete(incident)
            db.session.commit()
            return '', 204

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

@incident_bp.route('/api/services/<int:service_id>/incidents', methods=['GET'], endpoint='get_service_incidents')
@jwt_required()
def get_service_incidents(service_id):
    """Get all incidents for a specific service"""
    try:
        incidents = Incident.query.filter_by(service_id=service_id).all()
        return jsonify([{
            'id': i.id,
            'service_id': i.service_id,
            'status': i.status,
            'description': i.description,
            'resolved': i.resolved,
            'created_at': i.created_at.isoformat(),
            'updated_at': i.updated_at.isoformat()
        } for i in incidents]), 200
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500