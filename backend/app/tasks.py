from flask import current_app
from app import db
from app.models import Service
from datetime import datetime
import time
import threading

def update_service_uptimes():
    """Background task to update service uptimes"""
    while True:
        try:
            app = current_app._get_current_object()
            with app.app_context():
                services = Service.query.all()
                for service in services:
                    service.uptime_percentage = service.calculate_uptime()
                    service.last_uptime_check = datetime.utcnow()
                db.session.commit()
        except Exception as e:
            print(f"Error updating uptimes: {e}")
        time.sleep(300)

def start_uptime_tracker():
    """Start the uptime tracking thread"""
    thread = threading.Thread(target=update_service_uptimes)
    thread.daemon = True
    thread.start()