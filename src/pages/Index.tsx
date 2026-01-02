import React from "react";
import { useNavigate } from "react-router-dom";

export default function Index() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <h1
        style={{
          fontSize: "64px",
          color: "#10b981",
          fontWeight: "bold",
          marginBottom: "20px"
        }}
      >
        INDEX PAGE - ROUTING IS WORKING!
      </h1>
      <p
        style={{
          fontSize: "24px",
          color: "#ffffff",
          marginBottom: "40px"
        }}
      >
        AppRouter and Layout are connected.
      </p>
      <button
        onClick={() => navigate("/library")}
        style={{
          background: "#10b981",
          color: "#ffffff",
          border: "2px solid #10b981",
          padding: "12px 24px",
          borderRadius: "8px",
          fontSize: "18px",
          fontWeight: "bold",
          cursor: "pointer"
        }}
      >
        Go to Library
      </button>
    </div>
  );
}