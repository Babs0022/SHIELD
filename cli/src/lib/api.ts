import axios, { AxiosInstance } from 'axios';
import { getApiKey } from './auth';

const API_BASE_URL = process.env.SHIELD_API_URL || 'http://localhost:3002/api/v1';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth header to all requests
    this.client.interceptors.request.use(async (config) => {
      const apiKey = await getApiKey();
      if (apiKey) {
        config.headers.Authorization = `Bearer ${apiKey}`;
      }
      return config;
    });

    // Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          throw new Error('Authentication failed. Please run: shield login');
        }

        const message = error.response?.data?.message || error.message;
        throw new Error(message);
      }
    );
  }

  async get(path: string) {
    return this.client.get(path);
  }

  async post(path: string, data?: any) {
    return this.client.post(path, data);
  }

  async delete(path: string) {
    return this.client.delete(path);
  }
}

export const apiClient = new APIClient();