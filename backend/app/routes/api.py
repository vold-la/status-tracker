from flask import Blueprint, jsonify
from app.models import Service, db

api_bp = Blueprint('api', __name__)

@api_bp.route('/api/v1/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'Service is running'
    })

@api_bp.route('/api/v1/services/status', methods=['GET'])
def get_services_status():
    """Get status of all services"""
    try:
        services = Service.query.all()
        return jsonify({
            'status': 'success',
            'data': [{
                'id': service.id,
                'name': service.name,
                'status': service.status,
                'updated_at': service.updated_at.isoformat()
            } for service in services]
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@api_bp.route('/api/v1/services/<int:service_id>/status', methods=['GET'])
def get_service_status(service_id):
    """Get status of a specific service"""
    try:
        service = Service.query.get_or_404(service_id)
        return jsonify({
            'status': 'success',
            'data': {
                'id': service.id,
                'name': service.name,
                'status': service.status,
                'updated_at': service.updated_at.isoformat()
            }
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500