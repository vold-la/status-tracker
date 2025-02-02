from flask import Blueprint, jsonify
from app.models import Service, Incident, StatusHistory
from collections import defaultdict
from datetime import datetime, timedelta

status_bp = Blueprint('status', __name__)

def get_system_status(services):
    """Calculate overall system status based on service statuses"""
    if not services:
        return "Unknown"
    
    status_priority = {
        "Outage": 3,
        "Degraded": 2, 
        "Operational": 1
    }
    
    highest_priority = max(services, key=lambda x: status_priority.get(x.status, 0))
    return highest_priority.status

def get_status():
    """Get status of all services and related incidents"""
    try:
        services = Service.query.all()
        
        recent_time = datetime.utcnow() - timedelta(hours=24)
        recent_incidents = Incident.query.filter(
            Incident.created_at >= recent_time
        ).order_by(Incident.created_at.desc()).all()
        
        service_incidents = defaultdict(list)
        for incident in recent_incidents:
            service_incidents[incident.service_id].append({
                'id': incident.id,
                'status': incident.status,
                'description': incident.description,
                'created_at': incident.created_at.isoformat(),
                'resolved': incident.resolved
            })

        status_response = {
            'overall_status': get_system_status(services),
            'last_updated': datetime.utcnow().isoformat(),
            'services': [{
                'id': service.id,
                'name': service.name,
                'status': service.status,
                'incidents': service_incidents.get(service.id, [])
            } for service in services],
            'incident_count': {
                'total': len(recent_incidents),
                'ongoing': len([i for i in recent_incidents if not i.resolved])
            }
        }
        
        return status_response

    except Exception as e:
        return {'error': 'Error fetching status', 'details': str(e)}

@status_bp.route('/api/status', methods=['GET'])
def public_status():
    """Public endpoint to get system status and incidents"""
    try:
        services = Service.query.all()
        overall_status = Service.get_overall_status(services)
        
        services_with_history = []
        for service in services:
            history = StatusHistory.query\
                .filter_by(service_id=service.id)\
                .order_by(StatusHistory.timestamp.desc())\
                .limit(30)\
                .all()
                
            services_with_history.append({
                'id': service.id,
                'name': service.name,
                'status': service.status,
                'incidents': [{
                    'id': i.id,
                    'status': i.status,
                    'description': i.description,
                    'created_at': i.created_at.isoformat(),
                    'resolved': i.resolved
                } for i in service.incidents if not i.resolved],
                'status_history': [{
                    'status': h.status,
                    'timestamp': h.timestamp.isoformat()
                } for h in history]
            })

        status_response = {
            'overall_status': overall_status,
            'last_updated': datetime.utcnow().isoformat(),
            'services': services_with_history,
            'incident_count': {
                'total': sum(len(s.incidents) for s in services),
                'ongoing': sum(len([i for i in s.incidents if not i.resolved]) for s in services)
            }
        }
        
        return jsonify(status_response), 200

    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500