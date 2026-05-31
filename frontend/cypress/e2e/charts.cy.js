/// <reference types="cypress" />

describe("Charts dashboard", () => {
  beforeEach(() => {
    cy.mockChartsApi();
    cy.visit("/charts");
  });

  it("shows a spinner while data loads and then renders chart cards", () => {
    // loader exists first …
    cy.get(".animate-spin").should("exist");

    // … then cards appear after the API returns
    cy.wait("@getProperties");
    cy.get(".animate-spin").should("not.exist");
    cy.get("[data-cy=chart-card]").should("have.length.at.least", 3);
  });

  it("normalises titles & subtitles correctly", () => {
    cy.wait("@getProperties");
    cy.contains("Home-type distribution");
    cy.contains("Breakdown of number of listings per home type");
  });

  it("dark-mode toggle switches themes and persists to localStorage", () => {
    cy.wait("@getProperties");
    const toggle = () => cy.get('button[aria-label="Toggle theme"]');

    // initial state – light
    cy.get("html").should("not.have.class", "dark");
    toggle().click();

    // switched to dark
    cy.get("html").should("have.class", "dark");
    cy.window().its("localStorage.dark-mode").should("eq", "true");

    // toggle back
    toggle().click();
    cy.get("html").should("not.have.class", "dark");
    cy.window().its("localStorage.dark-mode").should("eq", "false");
  });

  it("“Back to Chat” buttons navigate correctly", () => {
    cy.wait("@getProperties");
    cy.get('a[title="Back to Chat"]').first().click();
    cy.url().should("include", "/chat"); // assumes /chat exists
    cy.go("back");

    // in-page button at bottom
    cy.contains("main a", "Back to Chat").click();
    cy.url().should("include", "/chat");
  });
});
