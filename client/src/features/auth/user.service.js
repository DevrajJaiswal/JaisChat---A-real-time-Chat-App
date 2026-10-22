
import { apiRequest } from "../../lib/api.js";

export async function syncCurrentUser() {
  return apiRequest("/users/sync", {
    method: "POST",
  });
}

export async function getCurrentUser() {
  return apiRequest("/users/me");
}

export async function saveMyProfile(profileData) {
  return apiRequest("/users/me/profile", {
    method: "PUT",
    body: JSON.stringify(profileData),
  });
}
