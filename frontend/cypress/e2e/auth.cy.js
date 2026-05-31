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
});
