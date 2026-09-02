"""
High School Management System API

A simple FastAPI application that allows students to view, sign up for, and
manage extracurricular activities at Mergington High School.
"""

import os
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field


app = FastAPI(
    title="Mergington High School API",
    description="API for viewing and signing up for extracurricular activities",
)

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount(
    "/static",
    StaticFiles(directory=os.path.join(Path(__file__).parent, "static")),
    name="static",
)


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1)
    email: str = Field(..., min_length=1)
    password: str = Field(..., min_length=6)


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=1)
    password: str = Field(..., min_length=6)


# In-memory activity database
activities = {
    "Chess Club": {
        "description": "Learn strategies and compete in chess tournaments",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 12,
        "participants": ["michael@mergington.edu", "daniel@mergington.edu"],
    },
    "Programming Class": {
        "description": "Learn programming fundamentals and build software projects",
        "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 20,
        "participants": ["emma@mergington.edu", "sophia@mergington.edu"],
    },
    "Gym Class": {
        "description": "Physical education and sports activities",
        "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM",
        "max_participants": 30,
        "participants": ["john@mergington.edu", "olivia@mergington.edu"],
    },
    "Soccer Team": {
        "description": "Join the school soccer team and compete in matches",
        "schedule": "Tuesdays and Thursdays, 4:00 PM - 5:30 PM",
        "max_participants": 22,
        "participants": ["liam@mergington.edu", "noah@mergington.edu"],
    },
    "Basketball Team": {
        "description": "Practice and play basketball with the school team",
        "schedule": "Wednesdays and Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["ava@mergington.edu", "mia@mergington.edu"],
    },
    "Art Club": {
        "description": "Explore your creativity through painting and drawing",
        "schedule": "Thursdays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["amelia@mergington.edu", "harper@mergington.edu"],
    },
    "Drama Club": {
        "description": "Act, direct, and produce plays and performances",
        "schedule": "Mondays and Wednesdays, 4:00 PM - 5:30 PM",
        "max_participants": 20,
        "participants": ["ella@mergington.edu", "scarlett@mergington.edu"],
    },
    "Math Club": {
        "description": "Solve challenging problems and participate in math competitions",
        "schedule": "Tuesdays, 3:30 PM - 4:30 PM",
        "max_participants": 10,
        "participants": ["james@mergington.edu", "benjamin@mergington.edu"],
    },
    "Debate Team": {
        "description": "Develop public speaking and argumentation skills",
        "schedule": "Fridays, 4:00 PM - 5:30 PM",
        "max_participants": 12,
        "participants": ["charlotte@mergington.edu", "henry@mergington.edu"],
    },
}


users = {
    "michael@mergington.edu": {"name": "Michael", "password": "student123"},
    "emma@mergington.edu": {"name": "Emma", "password": "student123"},
}

sessions: dict[str, str] = {}


def get_session_email(request: Request) -> str | None:
    token = request.cookies.get("session_token")
    if not token:
        return None
    return sessions.get(token)


def get_current_user(request: Request) -> dict:
    email = get_session_email(request)
    if not email:
        raise HTTPException(status_code=401, detail="Authentication required")

    user = users.get(email)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return {"email": email, "name": user["name"]}


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/api/me")
def get_me(request: Request):
    return get_current_user(request)


@app.post("/api/register")
def register_user(payload: RegisterRequest, response: Response):
    email = payload.email.strip().lower()
    name = payload.name.strip()

    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    if email in users:
        raise HTTPException(status_code=400, detail="An account already exists for this email")

    users[email] = {"name": name, "password": payload.password}
    token = uuid.uuid4().hex
    sessions[token] = email
    response.set_cookie("session_token", token, httponly=True, samesite="lax")
    return {"message": f"Welcome, {name}!", "user": {"email": email, "name": name}}


@app.post("/api/login")
def login_user(payload: LoginRequest, response: Response):
    email = payload.email.strip().lower()
    user = users.get(email)

    if not user or user["password"] != payload.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = uuid.uuid4().hex
    sessions[token] = email
    response.set_cookie("session_token", token, httponly=True, samesite="lax")
    return {
        "message": f"Logged in as {user['name']}",
        "user": {"email": email, "name": user["name"]},
    }


@app.post("/api/logout")
def logout_user(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        sessions.pop(token, None)
    response.delete_cookie("session_token")
    return {"message": "Logged out successfully"}


@app.get("/api/my-activities")
def my_activities(request: Request):
    user = get_current_user(request)
    my_activities_list = [
        name for name, activity in activities.items() if user["email"] in activity["participants"]
    ]
    return {"email": user["email"], "activities": my_activities_list}


@app.get("/activities")
def get_activities():
    return activities


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, email: str, request: Request):
    """Sign up a student for an activity."""
    session_email = get_session_email(request)
    if session_email and email.lower() != session_email:
        raise HTTPException(status_code=403, detail="You can only sign up with your own account")

    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    activity = activities[activity_name]
    normalized_email = email.strip().lower()

    if normalized_email in activity["participants"]:
        raise HTTPException(status_code=400, detail="Student is already signed up")

    if len(activity["participants"]) >= activity["max_participants"]:
        raise HTTPException(status_code=400, detail="This activity is full")

    activity["participants"].append(normalized_email)
    return {"message": f"Signed up {normalized_email} for {activity_name}"}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(activity_name: str, email: str, request: Request):
    """Unregister a student from an activity."""
    session_email = get_session_email(request)
    if session_email and email.lower() != session_email:
        raise HTTPException(status_code=403, detail="You can only unregister your own account")

    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    activity = activities[activity_name]
    normalized_email = email.strip().lower()

    if normalized_email not in activity["participants"]:
        raise HTTPException(status_code=400, detail="Student is not signed up for this activity")

    activity["participants"].remove(normalized_email)
    return {"message": f"Unregistered {normalized_email} from {activity_name}"}
