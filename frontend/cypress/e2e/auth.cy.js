/// <reference types="cypress" />

describe("Login & Sign-up flows", () => {
  it("logs the user in successfully", () => {
    cy.stubAuthApi(); // happy-path stub
    cy.visit("/login");

    cy.get('input[type="email"]').type("user@example.com");
    cy.get('input[type="password"]').type("password123");
    cy.contains("button", "Log In").click();

    cy.wait("@postLogin");
    cy.url().should("include", "/chat");
    cy.getCookie("estatewise_token")
      .its("value")
      .should("eq", "test-jwt-token");
  });

  it("shows error on invalid credentials", () => {
    cy.stubAuthApi({ fail: true });
    cy.visit("/login");

    cy.get('input[type="email"]').type("bad@user.com");
    cy.get('input[type="password"]').type("wrongpass");
    cy.contains("button", "Log In").click();

    cy.wait("@postLogin");
    cy.contains("Invalid credentials").should("be.visible");
  });

  it("signs the user up (and auto-logs in)", () => {
    cy.stubAuthApi(); // signup 201 + login 200
    cy.visit("/signup");

    cy.get('input[placeholder="Username"]').type("NewUser");
    cy.get('input[type="email"]').type("new@user.com");
    cy.get('input[type="password"]').first().type("secret123");
    cy.get('input[placeholder="Confirm Password"]').type("secret123");
    cy.contains("button", "Sign Up").click();

    cy.wait("@postSignup");
    cy.wait("@postLogin");
    cy.url().should("include", "/chat");
  });

  it("blocks sign-up when passwords differ", () => {
    cy.stubAuthApi();
    cy.visit("/signup");

    cy.get('input[placeholder="Username"]').type("Mismatch");
    cy.get('input[type="email"]').type("mm@user.com");
    cy.get('input[type="password"]').first().type("secret123");
    cy.get('input[placeholder="Confirm Password"]').type("other");
    cy.contains("button", "Sign Up").click();

    cy.contains("Passwords do not match").should("be.visible");
    cy.get("@postSignup.all").should("have.length", 0); // API never called
  });
});
