import axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios";

// Define the base URL for your API
const BASE_URL = "/api";

// Create an Axios instance with custom configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // You can modify the request config here (e.g., add authentication tokens)
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // You can modify the response data here if needed
    return response;
  },
  (error: AxiosError) => {
    // Handle errors globally
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("Response error:", error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error("Request error:", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("Error:", error.message);
    }
    return Promise.reject(error);
  },
);

export type CrawlParams = {
  urls: string[];
  delay: number;
  crawling_concurrency: number;
  processing_concurrency: number;
};

type CrawlResponse = {
  items: string[];
};

const api = {
  crawl: async ({
    urls,
    delay,
    crawling_concurrency,
    processing_concurrency,
  }: CrawlParams) => {
    const response = await apiClient.post<CrawlResponse>("/crawl", {
      urls,
      delay,
      crawling_concurrency,
      processing_concurrency,
    });
    return response.data;
  },
};

export default api;
