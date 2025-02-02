from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import relationship
from flask_security import UserMixin, RoleMixin
from werkzeug.security import check_password_hash, generate_password_hash
from datetime import datetime, timedelta
from . import db

SERVICE_STATUSES = ['Operational', 'Degraded', 'Outage']
INCIDENT_STATUSES = ['Ongoing', 'Resolved', 'Scheduled']

class User(db.Model, UserMixin):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    fs_uniquifier = db.Column(db.String(255), unique=True, nullable=False)
    active = db.Column(db.Boolean, default=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=True)

    organization = relationship("Organization", back_populates="users")
    roles = db.relationship('Role', secondary='user_roles',
                          backref=db.backref('users', lazy='dynamic'))

    def verify_password(self, password):
        return check_password_hash(self.password, password)

    @staticmethod
    def hash_password(password):
        return generate_password_hash(password)

    def __str__(self):
        return self.email

class Role(db.Model, RoleMixin):
    __tablename__ = 'roles'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True)
    description = db.Column(db.String(255))

    def __str__(self):
        return self.name

class UserRoles(db.Model):
    __tablename__ = 'user_roles'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'))
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id', ondelete='CASCADE'))

    def __str__(self):
        return f"UserRole {self.user_id}:{self.role_id}"

class Organization(db.Model):
    __tablename__ = 'organizations'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    services = relationship("Service", back_populates="organization", cascade="all, delete-orphan")

    def __str__(self):
        return self.name

class Service(db.Model):
    __tablename__ = 'services'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(50), nullable=False, default="Operational")
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    uptime_percentage = db.Column(db.Float, default=100.0)
    last_uptime_check = db.Column(db.DateTime, default=datetime.utcnow)

    organization = relationship("Organization", back_populates="services")
    incidents = relationship("Incident", back_populates="service", cascade="all, delete-orphan")
    status_history = relationship("StatusHistory", back_populates="service", cascade="all, delete-orphan")

    def __str__(self):
        return self.name

    @staticmethod
    def validate_status(status):
        if status not in SERVICE_STATUSES:
            raise ValueError(f"Invalid service status. Must be one of {SERVICE_STATUSES}")
        return True
    
    def get_overall_status(services):
        """Calculate overall system status based on service statuses"""
        if not services:
            return "Unknown"
        
        status_priority = {
            "Outage": 3,
            "Degraded": 2,
            "Operational": 1
        }
        
        current_status = "Operational"
        for service in services:
            if status_priority.get(service.status, 0) > status_priority.get(current_status, 0):
                current_status = service.status
        
        return current_status
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'status': self.status,
            'organization_id': self.organization_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def calculate_uptime(self):
        """Calculate uptime percentage based on status history"""
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        history = StatusHistory.query.filter(
            StatusHistory.service_id == self.id,
            StatusHistory.timestamp >= thirty_days_ago
        ).order_by(StatusHistory.timestamp.desc()).all()

        if not history:
            return 100.0

        total_time = 0
        operational_time = 0
        prev_status = None
        prev_time = None

        for entry in history:
            if prev_time:
                time_diff = (prev_time - entry.timestamp).total_seconds()
                total_time += time_diff
                if prev_status == 'Operational':
                    operational_time += time_diff
            prev_status = entry.status
            prev_time = entry.timestamp

        if total_time == 0:
            return 100.0

        return (operational_time / total_time) * 100

class Incident(db.Model):
    __tablename__ = 'incidents'

    id = db.Column(db.Integer, primary_key=True)
    service_id = db.Column(db.Integer, db.ForeignKey('services.id'), nullable=False)
    status = db.Column(db.String(50), nullable=False, default="Ongoing")
    description = db.Column(db.Text, nullable=False)
    resolved = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    service = relationship("Service", back_populates="incidents")

    def __str__(self):
        return f"Incident {self.id} - {self.status}"

    @staticmethod
    def validate_status(status):
        if status not in INCIDENT_STATUSES:
            raise ValueError(f"Invalid incident status. Must be one of {INCIDENT_STATUSES}")
        return status
    
class StatusHistory(db.Model):
    __tablename__ = 'status_history'

    id = db.Column(db.Integer, primary_key=True)
    service_id = db.Column(db.Integer, db.ForeignKey('services.id'), nullable=False)
    status = db.Column(db.String(50), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    service = relationship("Service", back_populates="status_history")

    def to_dict(self):
        return {
            'id': self.id,
            'service_id': self.service_id,
            'status': self.status,
            'timestamp': self.timestamp.isoformat(),
            'uptime_value': 100 if self.status == 'Operational' else 50 if self.status == 'Degraded' else 0


        }

class EmailSubscriber(db.Model):
    __tablename__ = 'email_subscribers'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_verified = db.Column(db.Boolean, default=False)
    verification_token = db.Column(db.String(255), unique=True)
