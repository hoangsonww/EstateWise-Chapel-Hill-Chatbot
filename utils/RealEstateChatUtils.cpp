#include <iostream>
#include <vector>
#include <string>
#include <unordered_map>
#include <cmath>
#include <random>
#include <ctime>

namespace RealEstateChat {

// ===== Secure Auth (Simplified Hash-Based Check) =====
bool authenticateUser(const std::string& username, const std::string& password) {
    std::hash<std::string> hasher;
    size_t storedHash = hasher("securepassword123"); // Replace with real DB check
    return hasher(password) == storedHash;
}

// ===== Conversation History Management =====
struct Message {
    std::string sender;
    std::string content;
    time_t timestamp;
};

std::unordered_map<std::string, std::vector<Message>> conversationHistory;

void addMessage(const std::string& userId, const std::string& sender, const std::string& content) {
    Message msg = {sender, content, std::time(nullptr)};
    conversationHistory[userId].push_back(msg);
}

// ===== kNN (Property Similarity) =====
struct Property {
    int id;
    std::vector<float> features; // e.g., [price, size, rooms, distance_to_city_center]
};

float euclideanDistance(const std::vector<float>& a, const std::vector<float>& b) {
    float sum = 0.0f;
    for (size_t i = 0; i < a.size(); ++i)
        sum += (a[i] - b[i]) * (a[i] - b[i]);
    return std::sqrt(sum);
}

std::vector<Property> kNearestProperties(const Property& target, const std::vector<Property>& dataset, int k) {
    std::vector<std::pair<float, Property>> distances;
    for (const auto& prop : dataset) {
        float dist = euclideanDistance(target.features, prop.features);
        distances.push_back({dist, prop});
    }

    std::sort(distances.begin(), distances.end(),
              [](auto& a, auto& b) { return a.first < b.first; });

    std::vector<Property> result;
    for (int i = 0; i < k && i < distances.size(); ++i)
        result.push_back(distances[i].second);
    return result;
}

// ===== K-Means Clustering (for market segmentation) =====
std::vector<int> kMeansCluster(const std::vector<Property>& data, int k, int maxIter = 100) {
    std::vector<std::vector<float>> centroids(k, data[0].features);
    std::vector<int> labels(data.size(), 0);
    std::default_random_engine randGen(time(nullptr));

    for (int i = 0; i < k; ++i)
        centroids[i] = data[randGen() % data.size()].features;

    for (int iter = 0; iter < maxIter; ++iter) {
        // Assignment step
        for (size_t i = 0; i < data.size(); ++i) {
            float minDist = INFINITY;
            for (int j = 0; j < k; ++j) {
                float dist = euclideanDistance(data[i].features, centroids[j]);
                if (dist < minDist) {
                    minDist = dist;
                    labels[i] = j;
                }
            }
        }

        // Update step
        std::vector<std::vector<float>> newCentroids(k, std::vector<float>(data[0].features.size(), 0.0f));
        std::vector<int> counts(k, 0);

        for (size_t i = 0; i < data.size(); ++i) {
            int cluster = labels[i];
            for (size_t f = 0; f < data[i].features.size(); ++f)
                newCentroids[cluster][f] += data[i].features[f];
            counts[cluster]++;
        }

        for (int j = 0; j < k; ++j)
            for (size_t f = 0; f < newCentroids[j].size(); ++f)
                newCentroids[j][f] /= std::max(1, counts[j]);

        centroids = newCentroids;
    }

    return labels;
}

// ===== Chain-of-Thought Simulation =====
std::string simulateReasoning(const std::string& question) {
    return "Analyzing user preferences → Matching budget and location → Filtering amenities → Recommending top listings";
}

// ===== Mixture-of-Experts Routing =====
std::string routeToExpert(const std::string& userQuery) {
    if (userQuery.find("price") != std::string::npos)
        return "PricingExpert";
    else if (userQuery.find("location") != std::string::npos)
        return "GeoExpert";
    else
        return "GeneralExpert";
}

// ===== RAG Placeholder =====
std::string fetchFromRAG(const std::string& query) {
    return "Based on recent data, here are some matching listings and market trends.";
}

// ===== Utility Entrypoint Test =====
void testUtilities() {
    if (authenticateUser("user", "securepassword123"))
        std::cout << "User authenticated.\n";

    addMessage("user1", "agent", "Hello! Looking for a 3-bedroom house?");
    std::cout << "Messages for user1: " << conversationHistory["user1"].size() << "\n";

    Property p1 = {1, {300000, 1200, 3, 5}};
    Property p2 = {2, {280000, 1100, 3, 6}};
    Property p3 = {3, {350000, 1300, 4, 4}};
    std::vector<Property> db = {p1, p2, p3};

    auto knn = kNearestProperties(p1, db, 2);
    std::cout << "Nearest properties to p1: " << knn.size() << "\n";

    auto clusters = kMeansCluster(db, 2);
    std::cout << "Cluster assignments: ";
    for (int c : clusters) std::cout << c << " ";
    std::cout << "\n";

    std::cout << simulateReasoning("What can I afford in this area?") << "\n";
    std::cout << "Expert routed to: " << routeToExpert("Tell me about location pros") << "\n";
    std::cout << fetchFromRAG("Current property trends in Austin") << "\n";
}

} // namespace RealEstateChat

// ===== Main for Demonstration =====
int main() {
    RealEstateChat::testUtilities();
    return 0;
}
