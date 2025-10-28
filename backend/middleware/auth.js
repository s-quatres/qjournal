const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

// Initialize JWKS client to fetch Keycloak public keys
const client = jwksClient({
  jwksUri: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/certs`,
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
});

// Function to get the signing key
function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(
    token,
    getKey,
    {
      algorithms: ["RS256"],
      issuer: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`,
    },
    (err, decoded) => {
      if (err) {
        console.error("Token verification failed:", err.message);
        return res.status(403).json({ error: "Invalid or expired token" });
      }

      // Attach user info to request
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        firstName: decoded.given_name,
        lastName: decoded.family_name,
        name: decoded.name,
        preferredUsername: decoded.preferred_username,
      };

      console.log("Authenticated user:", req.user.email);
      next();
    }
  );
};

module.exports = { authenticateToken };
