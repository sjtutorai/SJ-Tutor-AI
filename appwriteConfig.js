import { Client, Account } from "appwrite";

const client = new Client();
const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;

if (projectId) {
  client
    .setEndpoint(endpoint)
    .setProject(projectId);
} else {
  console.warn("Appwrite Project ID missing. Appwrite features will be disabled.");
}

const account = new Account(client);

export { account };