import React from "react";
import { Link } from "react-router-dom";

export default function Index() {
  console.log("Index page rendering!", new Date().toISOString());

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "#0a0a0a",
      color: "#ffffff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{ textAlign: "center", padding: "20px" }}>
        <h1 
          style={{ 
            fontSize: "64px", 
            fontWeight: "bold",
            marginBottom: "20px",
            color: "#10b981" 
          }}
        >
          NOSTRIL APP
        </h1>
        <p 
          style={{ 
            fontSize: "24px", 
            marginBottom: "40px",
            color: "#ffffff"
          }}
        >
          If you see this, React is working!
        </p>
        <a 
          href="/library"
          style={{
            display: "inline-block",
            padding: "16px 32px",
            backgroundColor: "#10b981",
            color: "#ffffff",
            textDecoration: "none",
            borderRadius: "8px",
            fontSize: "18px",
            fontWeight: "600"
          }}
        >
          Go to Library
        </a>
      </div>
    </div>
  );
}