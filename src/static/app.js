document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const authStatus = document.getElementById("auth-status");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const logoutBtn = document.getElementById("logout-btn");
  const loggedInUser = document.getElementById("logged-in-user");
  const emailInput = document.getElementById("email");

  const state = {
    user: null,
  };

  function setMessage(element, text, type = "info") {
    element.textContent = text;
    element.className = type;
    element.classList.remove("hidden");
  }

  function showAuthState() {
    if (!state.user) {
      authStatus.textContent = "Please log in or create an account to manage your signups.";
      authStatus.className = "info";
      authStatus.classList.remove("hidden");
      loggedInUser.textContent = "Not signed in";
      emailInput.value = "";
      emailInput.disabled = true;
      signupForm.querySelector("button").disabled = true;
      logoutBtn.classList.add("hidden");
      return;
    }

    authStatus.textContent = `Signed in as ${state.user.name} (${state.user.email})`;
    authStatus.className = "success";
    authStatus.classList.remove("hidden");
    loggedInUser.textContent = `Current student: ${state.user.email}`;
    emailInput.value = state.user.email;
    emailInput.disabled = false;
    signupForm.querySelector("button").disabled = false;
    logoutBtn.classList.remove("hidden");
  }

  async function fetchCurrentUser() {
    try {
      const response = await fetch("/api/me", { credentials: "same-origin" });
      if (!response.ok) {
        state.user = null;
        showAuthState();
        return;
      }

      const data = await response.json();
      state.user = data;
      showAuthState();
    } catch (error) {
      console.error("Error fetching current user:", error);
      state.user = null;
      showAuthState();
    }
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        }
      );

      const result = await response.json();

      if (response.ok) {
        setMessage(messageDiv, result.message, "success");
        fetchActivities();
        fetchCurrentUser();
      } else {
        setMessage(messageDiv, result.detail || "An error occurred", "error");
      }

      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      setMessage(messageDiv, "Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      name: document.getElementById("register-name").value,
      email: document.getElementById("register-email").value,
      password: document.getElementById("register-password").value,
    };

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        state.user = result.user;
        registerForm.reset();
        loginForm.reset();
        showAuthState();
        setMessage(messageDiv, result.message, "success");
      } else {
        setMessage(messageDiv, result.detail || "Registration failed.", "error");
      }

      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      setMessage(messageDiv, "Registration failed. Please try again.", "error");
      console.error("Error registering user:", error);
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      email: document.getElementById("login-email").value,
      password: document.getElementById("login-password").value,
    };

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        state.user = result.user;
        loginForm.reset();
        registerForm.reset();
        showAuthState();
        setMessage(messageDiv, result.message, "success");
      } else {
        setMessage(messageDiv, result.detail || "Login failed.", "error");
      }

      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      setMessage(messageDiv, "Login failed. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      const result = await response.json();
      state.user = null;
      showAuthState();
      setMessage(messageDiv, result.message, "info");
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      setMessage(messageDiv, "Failed to log out.", "error");
      console.error("Error logging out:", error);
    }
  });

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const activity = document.getElementById("activity").value;

    if (!state.user || email !== state.user.email) {
      setMessage(messageDiv, "Please log in before signing up.", "error");
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          credentials: "same-origin",
        }
      );

      const result = await response.json();

      if (response.ok) {
        setMessage(messageDiv, result.message, "success");
        signupForm.reset();
        fetchActivities();
      } else {
        setMessage(messageDiv, result.detail || "An error occurred", "error");
      }

      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      setMessage(messageDiv, "Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  fetchCurrentUser();
  fetchActivities();
});
