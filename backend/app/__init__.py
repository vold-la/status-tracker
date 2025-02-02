from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_security import Security, SQLAlchemyUserDatastore
from werkzeug.security import check_password_hash, generate_password_hash
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_mail import Mail

from app.config import DevelopmentConfig
from sqlalchemy.exc import OperationalError
import logging
import os

db = SQLAlchemy()
jwt = JWTManager()
socketio = SocketIO()
mail = Mail()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_db(app):
    """Initialize database with error handling"""
    try:
        db.init_app(app)
        with app.app_context():
            db.create_all()

        userdatastore: SQLAlchemyUserDatastore = app.security.datastore
        userdatastore.find_or_create_role(name='admin', description='Administrator')

        if not userdatastore.find_user(email='administrator@plivo.com'):
            userdatastore.create_user(email='administrator@plivo.com', password=generate_password_hash('plivo123'), roles=['admin'])
       
        db.session.commit()

    except OperationalError as e:
        print("Database connection failed. Please check if PostgreSQL is running.")
        print(f"Error: {e}")
        raise

def register_blueprints(app):
    try:
        from app.routes.auth import auth_bp
        from app.routes.service import service_bp
        from app.routes.incident import incident_bp
        from app.routes.status import status_bp
        from app.routes.notification import notification_bp 
        from app.routes.api import api_bp

        app.register_blueprint(auth_bp)
        app.register_blueprint(service_bp)
        app.register_blueprint(incident_bp)
        app.register_blueprint(status_bp)
        app.register_blueprint(notification_bp)
        app.register_blueprint(api_bp)

        logger.info("Blueprints registered successfully")
    except Exception as e:
        logger.error(f"Error registering blueprints: {str(e)}")
        raise

def create_app():
    app = Flask(__name__)
    app.config.from_object(DevelopmentConfig)
    
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:3000"],
            "supports_credentials": True,
            "allow_headers": ["Content-Type", "Authorization"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        }
    })
    
    socketio.init_app(app, 
                     cors_allowed_origins=["http://localhost:3000"],
                     async_mode='eventlet',
                     logger=True,
                     engineio_logger=True)
    
    app.config['SESSION_TYPE'] = 'filesystem'
    
    from app.models import User, Role
    datastore = SQLAlchemyUserDatastore(db, User, Role)
    app.security = Security(app, datastore=datastore, register_blueprint=False)

    app.app_context().push()
    init_db(app)
    jwt.init_app(app)

    app.config.update(
        MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com'),
        MAIL_PORT = int(os.getenv('MAIL_PORT', 587)),
        MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true',
        MAIL_USERNAME = os.getenv('MAIL_USERNAME'),
        MAIL_PASSWORD = os.getenv('MAIL_APP_PASSWORD'),
        MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER')
    )
    mail.init_app(app)

    register_blueprints(app)

    @app.errorhandler(Exception)
    def handle_error(error):
        logger.error(f"Unhandled error: {str(error)}")
        return jsonify({
            "error": "Internal server error",
            "message": str(error)
        }), 500

    with app.app_context():
        from app.tasks import start_uptime_tracker
        try:
            start_uptime_tracker()
            logger.info("Background tasks initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize background tasks: {e}")

    logger.info("App created successfully")
    
    return app
