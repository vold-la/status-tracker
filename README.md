# Status Tracker Application

Real-time status updates and monitor the performance of various services. It allows users to view historical data, current status and incidents affecting the services.

- Demo Link: [click here](https://drive.google.com/drive/folders/12jwyuib6sQvxmn1LtKUZcLbFoxBr9VEa)

## Getting Started

### Prerequisites
- Node.js
- Python3
- PostgreSQL

### Installation

1. Clone the repository:
```bash
git clone https://github.com/vold-la/status-tracker.git
```

2. Backend Setup:

Create .env in backend folder:
```
DATABASE_URL=sqlite:///db.sqlite3
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=dummy@gmail.com
MAIL_PASSWORD=password
```

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
flask run
```

4. Frontend Setup:
```bash
cd frontend
npm install
npm run dev
```

## Features

- User Auth
- Service Management
- Incident Tracking
- Real time Update
- Public Status Page
- Uptime Monitoring
- Email Notification

## Tech Stack

### Frontend
- React
- ShadcnUI
- TailwindCSS
- Socket.io Client

### Backend
- Python Flask
- Flask-SocketIO
- JWT Auth