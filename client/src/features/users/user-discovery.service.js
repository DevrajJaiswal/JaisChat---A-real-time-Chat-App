
import { apiRequest } from "../../lib/api.js";

export async function searchUsers(searchTerm) {
    const query = searchTerm.trim();

    if (query.length < 2) {
        return { success: true, users: [] };
    }

    return apiRequest(
        `/users/search?q=${encodeURIComponent(query)}`
    );
}
