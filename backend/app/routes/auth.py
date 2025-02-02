from flask import Blueprint, request, jsonify, flash
from flask_jwt_extended import (
    create_access_token, 
    jwt_required,
    get_jwt_identity,
    create_refresh_token
)
from datetime import timedelta
from ..models import User, Role, db, Organization
import uuid
from ..utils import validate_email, validate_password
import logging

auth_bp = Blueprint('auth', __name__)
logger = logging.getLogger(__name__)

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data or not data.get('email') or not data.get('password'):
            flash('Email and password required', 'error')
            return jsonify({"error": "Email and password required"}), 400

        if not validate_email(data['email']):
            flash('Invalid email format', 'error')
            return jsonify({"error": "Invalid email format"}), 400

        user = User.query.filter_by(email=data['email']).first()
        if not user or not user.verify_password(data['password']):
            flash('Invalid credentials', 'error') 
            return jsonify({"error": "Invalid credentials"}), 401

        access_token = create_access_token(identity=user.email)
        refresh_token = create_refresh_token(identity=user.email)

        flash('Successfully logged in', 'success')
        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': {
                'email': user.email,
                'roles': [role.name for role in user.roles]
            },
            'organization': {
                'id': user.organization.id,
                'name': user.organization.name
            } if user.organization else None
        }), 200
    except Exception as e:
        flash(f'Login error: {str(e)}', 'error')
        logger.error(f"Login error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@auth_bp.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing request body"}), 400

        email = data.get('email')
        password = data.get('password')
        organization_name = data.get('organization_name')

        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400
        
        if not validate_email(email):
            return jsonify({"error": "Invalid email format"}), 400

        is_valid, error_message = validate_password(password)
        if not is_valid:
            return jsonify({"error": error_message}), 400

        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({"error": "User already exists"}), 400

        organization = None
        if organization_name:
            organization = Organization.query.filter_by(name=organization_name).first()
            if not organization:
                organization = Organization(name=organization_name)
                db.session.add(organization)
                db.session.flush()

        
        is_admin = email.endswith('@plivo.com')
        role_name = 'admin' if is_admin else 'user'
        
        role = Role.query.filter_by(name=role_name).first()
        if not role:
            role = Role(name=role_name, description=f'{role_name.capitalize()} role')
            db.session.add(role)

        new_user = User(
            email=email,
            password=User.hash_password(password),
            fs_uniquifier=str(uuid.uuid4()),
            organization_id=organization.id if organization else None,
            active=True
        )
        new_user.roles.append(role)
        
        db.session.add(new_user)
        db.session.commit()
        
        logger.info(f"New user registered: {email} with role: {role_name}")

        return jsonify({
            "message": "User registered successfully",
            "user": {
                "email": new_user.email,
                "role": role_name,
                "organization": organization_name if organization else None
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Registration error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@auth_bp.route('/api/auth/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    try:
        current_user = get_jwt_identity()
        new_access_token = create_access_token(identity=current_user)
        return jsonify({'access_token': new_access_token}), 200
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500
    
@auth_bp.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        current_user_email = get_jwt_identity()
        user = User.query.filter_by(email=current_user_email).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        return jsonify({
            "user": {
                "email": user.email,
                "roles": [role.name for role in user.roles]
            },
            "organization": {
                "id": user.organization.id,
                "name": user.organization.name
            } if user.organization else None
        }), 200
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500