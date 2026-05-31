/// <reference types="cypress" />

describe("Chat page (guest mode)", () => {
  beforeEach(() => {
    cy.stubChatApi();
    cy.visit("/chat");
  });

  it("toggles the sidebar and dark-mode", () => {
    // desktop: sidebar starts visible
    cy.get("aside").should("be.visible");

    // hide sidebar
    cy.get('button[aria-label="Toggle Sidebar"]').click();
    cy.get("aside").first().should("have.css", "width", "0px");

    // dark-mode
    const toggle = () => cy.get('button[aria-label="Toggle Dark Mode"]');
    toggle().click();
    cy.get("html").should("have.class", "dark");
    cy.window().its("localStorage.dark-mode").should("eq", "true");
  });

  it("sends a message, shows loader phases, then renders model reply", () => {
    cy.get('input[placeholder="Type your message…"]').type(
      "Show me houses{enter}",
    );
    cy.wait("@postChat");

    // loader disappears → reply bubble appears
    cy.contains("Sure! Here are three great homes").should("be.visible");
  });

  it("switches expert views, copies text, and records feedback", () => {
    cy.sendMessage = (msg) =>
      cy.get('input[placeholder="Type your message…"]').type(`${msg}{enter}`);
    cy.sendMessage("Hi");

    cy.wait("@postChat");
    // open dropdown & choose "Data Analyst"
    cy.contains("button", "Combined").click();
    cy.contains("Data Analyst").click();
    cy.contains("From a data standpoint").should("be.visible");

    // copy button
    cy.get('button[aria-label="Copy message"]').click();
    cy.window()
      .its("navigator.clipboard")
      .invoke("readText")
      .should("include", "From a data standpoint");

    // thumbs-up
    cy.get('button[aria-label="Thumbs up"]').click();
    cy.wait("@rateChat");
    cy.get('button[aria-label="Thumbs up"] svg').should(
      "have.class",
      "text-green-600",
    );
  });
});
