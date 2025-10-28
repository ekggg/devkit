/**
 * EKG Public SDK - Development Environment
 *
 * This file provides a development environment for building and testing EKG widgets locally.
 */

import { EkgBus } from "./event-bus";
import { loadWidget as setupWidget, loadAsset } from "./ekg-widget";
import type { ChatNode } from "./types";

type EKGSDKAPI = {
  loadWidget(
    htmlPath: string,
    cssPath: string,
    jsPath: string,
    widgetName?: string,
    settings?: Record<string, unknown>,
  ): void;
};

type EventParam = {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "any";
  description?: string;
  required?: boolean;
  default?: unknown;
};

type EventDefinition = {
  name: string;
  description: string;
  params: EventParam[];
};

type WidgetPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Widget = {
  id: string;
  name: string;
  element?: HTMLElement;
  position: WidgetPosition;
  htmlPath: string;
  cssPath: string;
  jsPath: string;
  settings?: Record<string, unknown>;
};

const DEFAULT_WIDGET_POSITION: Widget["position"] = {
  x: 0,
  y: 0,
  width: 300,
  height: 200,
};

// TODO: Add more events
// TODO: Download this list from EKG servers?
const EVENTS: EventDefinition[] = [
  {
    name: "ekg.chat.sent",
    description: "Simulate a chat message event",
    params: [
      {
        name: "id",
        type: "string",
        description: "Unique message ID",
        default: "msg-001",
      },
      {
        name: "authorDisplayName",
        type: "string",
        description: "The display name of the user",
        default: "TestUser",
      },
      {
        name: "authorID",
        type: "string",
        description: "The ID of the user",
        default: "12345",
      },
      {
        name: "message",
        type: "object",
        description: "Chat message nodes (array of ChatNode objects)",
        default: [
          {
            type: "text",
            text: "Hello streamer! ",
          },
          {
            type: "emoji",
            id: "emotesv2_test",
            code: "Test Emote",
            authorId: "bartek26l_5062",
            src: "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_81bf0a4358bd465a8e9b5290ac361e6e/default/light/1.0",
            srcSet:
              "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_81bf0a4358bd465a8e9b5290ac361e6e/default/light/1.0 1x,https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_81bf0a4358bd465a8e9b5290ac361e6e/default/light/2.0 2x,https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_81bf0a4358bd465a8e9b5290ac361e6e/default/light/3.0 4x",
          },
        ] satisfies ChatNode[],
      },
      {
        name: "isBroadcaster",
        type: "boolean",
        description: "Are they the stream owner",
        default: false,
      },
      {
        name: "isVip",
        type: "boolean",
        default: false,
      },
      {
        name: "isModerator",
        type: "boolean",
        default: false,
      },
      {
        name: "isSubscriber",
        type: "boolean",
        default: false,
      },
    ],
  },
  {
    name: "ekg.channel.follow",
    description: "Simulate a follow event",
    params: [
      {
        name: "userDisplayName",
        type: "string",
        description: "The display name of the follower",
        default: "NewFollower",
      },
      {
        name: "userLogin",
        type: "string",
        description: "The login name of the follower",
        default: "newfollower",
      },
      {
        name: "userID",
        type: "string",
        description: "The ID of the follower",
        default: "54321",
      },
    ],
  },
  {
    name: "ekg.channel.subscription",
    description: "Simulate a subscription event",
    params: [
      {
        name: "userDisplayName",
        type: "string",
        description: "The display name of the subscriber",
        default: "NewSubscriber",
      },
      {
        name: "userLogin",
        type: "string",
        description: "The login name of the subscriber",
        default: "newsubscriber",
      },
      {
        name: "userID",
        type: "string",
        description: "The ID of the subscriber",
        default: "67890",
      },
      {
        name: "tier",
        type: "string",
        description:
          "Subscription tier (1000=Tier 1, 2000=Tier 2, 3000=Tier 3)",
        default: "1000",
      },
      {
        name: "cumulativeMonths",
        type: "number",
        description: "Total months subscribed",
        default: 1,
      },
      {
        name: "streakMonths",
        type: "number",
        description: "Consecutive months subscribed",
        default: 1,
      },
      {
        name: "isGift",
        type: "boolean",
        description: "Whether this is a gift subscription",
        default: false,
      },
      {
        name: "gifterDisplayName",
        type: "string",
        description: "Display name of the gifter (if gift)",
        default: "Gifter",
      },
    ],
  },
  {
    name: "ekg.channel.cheer",
    description: "Simulate a cheer (bits) event",
    params: [
      {
        name: "userDisplayName",
        type: "string",
        description: "The display name of the cheerer",
        default: "BitsCheerer",
      },
      {
        name: "userLogin",
        type: "string",
        description: "The login name of the cheerer",
        default: "bitscheerer",
      },
      {
        name: "userID",
        type: "string",
        description: "The ID of the cheerer",
        default: "11111",
      },
      {
        name: "bits",
        type: "number",
        description: "Number of bits cheered",
        default: 100,
      },
      {
        name: "message",
        type: "string",
        description: "Cheer message",
        default: "Cheer100 Great stream!",
      },
    ],
  },
  {
    name: "ekg.channel.donation",
    description: "Simulate a donation/tip event",
    params: [
      {
        name: "userDisplayName",
        type: "string",
        description: "The display name of the donor",
        default: "GenerousDonor",
      },
      {
        name: "userLogin",
        type: "string",
        description: "The login name of the donor",
        default: "generousdonor",
      },
      {
        name: "userID",
        type: "string",
        description: "The ID of the donor",
        default: "22222",
      },
      {
        name: "amount",
        type: "number",
        description: "Donation amount",
        default: 500,
      },
      {
        name: "currency",
        type: "string",
        description: "Currency code",
        default: "USD",
      },
      {
        name: "message",
        type: "string",
        description: "Donation message",
        default: "Keep up the great work!",
      },
    ],
  },
  {
    name: "ekg.channel.raid",
    description: "Simulate a raid event",
    params: [
      {
        name: "fromDisplayName",
        type: "string",
        description: "Display name of the raiding streamer",
        default: "RaidingStreamer",
      },
      {
        name: "fromLogin",
        type: "string",
        description: "Login name of the raiding streamer",
        default: "raidingstreamer",
      },
      {
        name: "fromID",
        type: "string",
        description: "ID of the raiding streamer",
        default: "33333",
      },
      {
        name: "viewerCount",
        type: "number",
        description: "Number of viewers in the raid",
        default: 25,
      },
    ],
  },
];

class EKGSDK {
  private eventID = 0;
  private widgets: Widget[] = [];
  private activeWidgetId: string | null = null;
  private container: HTMLElement | null = null;
  private sidePanel: HTMLElement | null = null;
  private widgetContainer: HTMLElement | null = null;
  private widgetSelect: HTMLSelectElement | null = null;

  constructor() {
    this.initializeUI();
  }

  /**
   * Load a widget into the development environment
   * @param htmlPath Path to the widget's HTML file
   * @param cssPath Path to the widget's CSS file
   * @param jsPath Path to the widget's JavaScript file
   * @param widgetName Optional name for the widget (defaults to 'Widget N')
   * @param settings Optional settings object for the widget
   * @returns Promise that resolves to true if the widget was loaded successfully
   */
  public loadWidget(
    htmlPath: string,
    cssPath: string,
    jsPath: string,
    widgetName?: string,
    settings?: Record<string, unknown>,
  ): void {
    try {
      // Check if the widget is already loaded
      const existingWidget = this.findWidgetByPaths(htmlPath, cssPath, jsPath);
      if (existingWidget) {
        console.warn("Widget already loaded, activating existing instance");
        this.setActiveWidget(existingWidget.id);
        return;
      }

      // Create and register the new widget
      const widget = this.createWidget(
        htmlPath,
        cssPath,
        jsPath,
        widgetName,
        settings,
      );
      this.registerWidget(widget);
    } catch (error) {
      console.error("Failed to load widget:", error);
    }
  }

  /**
   * Find a widget by its file paths
   */
  private findWidgetByPaths(
    htmlPath: string,
    cssPath: string,
    jsPath: string,
  ): Widget | undefined {
    return this.widgets.find(
      (w) =>
        w.htmlPath === htmlPath && w.cssPath === cssPath && w.jsPath === jsPath,
    );
  }

  /**
   * Create a new widget object
   */
  private createWidget(
    htmlPath: string,
    cssPath: string,
    jsPath: string,
    name?: string,
    settings?: Record<string, unknown>,
  ): Widget {
    return {
      id: `widget-${Date.now()}`,
      name: name || `Widget ${this.widgets.length + 1}`,
      htmlPath,
      cssPath,
      jsPath,
      position: { ...DEFAULT_WIDGET_POSITION },
      settings,
    };
  }

  /**
   * Register a new widget in the UI
   */
  private registerWidget(widget: Widget): void {
    this.widgets.push(widget);
    this.addWidgetToUI(widget);

    // If this is the first widget, make it active
    if (this.widgets.length === 1) {
      this.setActiveWidget(widget.id);
    }
  }

  /**
   * Initialize the development UI
   */
  private initializeUI(): void {
    // Create main container
    this.container = document.createElement("div");
    this.container.className =
      "fixed inset-0 w-full h-full flex z-[10000] pointer-events-none font-sans text-sm";

    // Create side panel
    this.sidePanel = this.createSidePanel();
    this.container.appendChild(this.sidePanel);

    // Create widget container
    this.widgetContainer = document.createElement("div");
    this.widgetContainer.className =
      "flex-1 relative overflow-hidden pointer-events-auto";
    this.container.appendChild(this.widgetContainer);

    // Add container to the document
    document.body.appendChild(this.container);
  }

  /**
   * Create the side panel with controls
   */
  private createSidePanel(): HTMLElement {
    const panel = document.createElement("div");
    panel.className =
      "w-[300px] bg-gray-100 p-4 border-r border-gray-300 overflow-y-auto pointer-events-auto";

    // Assemble the panel
    panel.append(
      this.createWidgetSelector(),
      this.createDivider(),
      this.createPositionControls(),
      this.createDivider(),
      this.createEventTestingSection(),
    );

    return panel;
  }

  /**
   * Create the widget selector dropdown
   */
  private createWidgetSelector(): HTMLElement {
    const container = document.createElement("div");
    container.className = "mb-4";

    const label = document.createElement("label");
    label.textContent = "Active Widget";
    label.className = "block mb-2 font-bold";

    this.widgetSelect = document.createElement("select");
    this.widgetSelect.className = "w-full p-2 rounded border border-gray-300";
    this.widgetSelect.addEventListener("change", (e) => {
      const target = e.target as HTMLSelectElement;
      this.setActiveWidget(target.value);
    });

    container.append(label, this.widgetSelect);
    return container;
  }

  /**
   * Create position and size controls
   */
  private createPositionControls(): HTMLElement {
    const container = document.createElement("div");
    container.style.marginBottom = "16px";

    const title = document.createElement("h3");
    title.textContent = "Position & Size";
    title.className = "mt-0 mb-3 text-lg font-semibold";

    container.appendChild(title);

    // Helper function to create a number input
    const createNumberInput = (
      label: string,
      value: number,
      min: number,
      max: number,
      step: number,
    ) => {
      const wrapper = document.createElement("div");
      wrapper.className = "mb-2";

      const labelEl = document.createElement("label");
      labelEl.className = "flex justify-between items-center";

      const input = document.createElement("input");
      input.type = "number";
      input.className = "w-20 p-1 border border-gray-300 rounded";
      input.value = value.toString();
      input.min = min.toString();
      input.max = max.toString();
      input.step = step.toString();

      labelEl.appendChild(document.createTextNode(label));
      labelEl.appendChild(input);
      wrapper.appendChild(labelEl);

      return { wrapper, input };
    };

    // X Position
    const xInput = createNumberInput("X:", 0, 0, 1000, 1);
    xInput.input.addEventListener("input", () =>
      this.updateWidgetPosition("x", parseInt(xInput.input.value)),
    );

    // Y Position
    const yInput = createNumberInput("Y:", 0, 0, 1000, 1);
    yInput.input.addEventListener("input", () =>
      this.updateWidgetPosition("y", parseInt(yInput.input.value)),
    );

    // Width
    const widthInput = createNumberInput("Width:", 300, 50, 2000, 10);
    widthInput.input.addEventListener("input", () =>
      this.updateWidgetSize("width", parseInt(widthInput.input.value)),
    );

    // Height
    const heightInput = createNumberInput("Height:", 200, 50, 2000, 10);
    heightInput.input.addEventListener("input", () =>
      this.updateWidgetSize("height", parseInt(heightInput.input.value)),
    );

    container.appendChild(xInput.wrapper);
    container.appendChild(yInput.wrapper);
    container.appendChild(widthInput.wrapper);
    container.appendChild(heightInput.wrapper);

    return container;
  }

  /**
   * Create a horizontal divider
   */
  private createDivider(): HTMLElement {
    const divider = document.createElement("hr");
    divider.style.border = "none";
    divider.style.borderTop = "1px solid #ddd";
    divider.style.margin = "16px 0";
    return divider;
  }

  /**
   * Add a widget to the UI controls
   */
  private addWidgetToUI(widget: Widget): void {
    if (!this.widgetSelect) return;

    const option = document.createElement("option");
    option.value = widget.id;
    option.textContent = widget.name;
    this.widgetSelect.appendChild(option);
  }

  /**
   * Set the active widget
   */
  private setActiveWidget(widgetId: string): void {
    if (this.activeWidgetId === widgetId) {
      return; // Already active
    }

    // Update the active widget ID
    this.activeWidgetId = widgetId;

    // Update the widget selector to reflect the active widget
    const select = this.sidePanel?.querySelector("select");
    if (select) {
      select.value = widgetId;
    }

    // Render the active widget
    this.renderActiveWidget();

    // Update the position controls to reflect the active widget's position
    this.updatePositionControls();
  }

  /**
   * Render the active widget
   */
  private renderActiveWidget(): void {
    if (!this.activeWidgetId || !this.widgetContainer) return;

    const widget = this.widgets.find((w) => w.id === this.activeWidgetId);
    if (!widget) return;

    // Clear existing widget
    this.widgetContainer.innerHTML = "";

    // Create widget element using the EkgWidget component
    const widgetElement = document.createElement("div");

    // Set initial position and size using Tailwind classes
    widgetElement.className = "absolute left-0 top-0 w-[300px] h-[200px]";

    this.widgetContainer.appendChild(widgetElement);
    widget.element = widgetElement;

    // Store the widget element reference for later updates
    if (widget.position) {
      this.updateWidgetElementPosition(widget.element, widget.position);
    }

    Promise.all([
      loadAsset(widget.htmlPath),
      loadAsset(widget.jsPath),
      loadAsset(widget.cssPath),
    ]).then(([template, js, css]) => {
      setupWidget(widgetElement, {
        template,
        js,
        css,
        settings: widget.settings ?? {},
        assets: {},
      });
    });
  }

  /**
   * Update widget position
   */
  private updateWidgetElementPosition(
    element: HTMLElement,
    position: { x: number; y: number; width: number; height: number },
  ): void {
    element.style.left = `${position.x}px`;
    element.style.top = `${position.y}px`;
    element.style.width = `${position.width}px`;
    element.style.height = `${position.height}px`;
  }

  /**
   * Update widget position based on control changes
   */
  private updateWidgetPosition(
    property: "x" | "y" | "width" | "height",
    value: number,
  ): void {
    if (!this.activeWidgetId) return;

    const widget = this.widgets.find((w) => w.id === this.activeWidgetId);
    if (!widget?.element) return;

    // Update the widget's position in our state
    if (!widget.position) {
      widget.position = { x: 0, y: 0, width: 300, height: 200 };
    }

    // Update the specific property
    widget.position[property] = value;

    // Apply the updated position to the element
    if (widget.element) {
      this.updateWidgetElementPosition(widget.element, widget.position);
    }
  }

  /**
   * Update the position controls to reflect the active widget's position
   */
  private updatePositionControls(): void {
    if (!this.activeWidgetId || !this.sidePanel) return;

    const widget = this.widgets.find((w) => w.id === this.activeWidgetId);
    if (!widget?.position) return;

    // Update all position and size inputs
    const updateInput = (selector: string, value: number) => {
      const input = this.sidePanel?.querySelector<HTMLInputElement>(
        `input[name="${selector}"]`,
      );
      if (input) {
        input.value = value.toString();
      }
    };

    updateInput("position-x", widget.position.x);
    updateInput("position-y", widget.position.y);
    updateInput("width", widget.position.width);
    updateInput("height", widget.position.height);
  }

  /**
   * Update widget size (kept for backward compatibility)
   */
  private updateWidgetSize(property: "width" | "height", value: number): void {
    this.updateWidgetPosition(property, value);
  }

  private createEventTestingSection(): HTMLElement {
    const section = document.createElement("div");
    section.className = "space-y-4";

    const heading = document.createElement("h3");
    heading.className = "text-lg font-semibold text-gray-900";
    heading.textContent = "Event Testing";

    const eventSelect = document.createElement("select");
    eventSelect.className = "w-full p-2 border border-gray-300 rounded";
    eventSelect.innerHTML = this.generateEventOptions();

    const paramsContainer = document.createElement("div");
    paramsContainer.className = "space-y-2";

    const fireButton = document.createElement("button");
    fireButton.className =
      "w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50";
    fireButton.textContent = "Fire Event";
    fireButton.disabled = true;

    // Set up event handlers
    this.setupEventHandlers(eventSelect, paramsContainer, fireButton);

    // Assemble the section
    section.append(heading, eventSelect, paramsContainer, fireButton);

    return section;
  }

  /**
   * Generate HTML options for the event selector
   */
  private generateEventOptions(): string {
    const options = EVENTS.map(
      (event) =>
        `<option value="${event.name}">${event.name} - ${event.description}</option>`,
    ).join("");

    return `<option value="">Select an event...</option>${options}`;
  }

  private get nextEventID() {
    return String(this.eventID++);
  }

  /**
   * Fire the selected event with the provided parameters
   */
  private fireSelectedEvent(eventName: string, container: HTMLElement): void {
    if (!eventName) return;

    const event = EVENTS.find((e) => e.name === eventName);
    if (!event) return;

    const eventToFire: {
      type: string;
      timestamp: number;
      id: string;
      data: Record<string, unknown>;
    } = {
      id: this.nextEventID,
      type: eventName,
      timestamp: Date.now(),
      data: {},
    };
    let isValid = true;

    event.params.forEach((param) => {
      const input = container.querySelector(`#param-${param.name}`) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement
        | null;
      if (!input) return;

      try {
        let value: unknown = input.value;

        // Parse the value based on its type
        if (param.type === "number") {
          value = parseFloat(input.value);
          if (isNaN(value as number))
            throw new Error(`Invalid number: ${input.value}`);
        } else if (param.type === "boolean") {
          value = (input as HTMLSelectElement).value === "true";
        } else if (param.type === "object") {
          value = JSON.parse((input as HTMLTextAreaElement).value);
        }

        eventToFire.data[param.name] = value;
      } catch (error) {
        console.error(`Error parsing parameter ${param.name}:`, error);
        isValid = false;
        // Highlight the problematic input
        input.classList.add("border-red-500");
        setTimeout(() => input.classList.remove("border-red-500"), 1000);
      }
    });

    if (!isValid) {
      console.error("Failed to fire event: Invalid parameters");
      return;
    }

    EkgBus.publish(eventToFire);
  }

  /**
   * Set up event handlers for the event testing UI
   */
  private setupEventHandlers(
    eventSelect: HTMLSelectElement,
    paramsContainer: HTMLElement,
    fireButton: HTMLButtonElement,
  ): void {
    eventSelect.addEventListener("change", () => {
      this.updateEventParamsUI(eventSelect.value, paramsContainer);
      fireButton.disabled = !eventSelect.value;
    });

    fireButton.addEventListener("click", () => {
      this.fireSelectedEvent(eventSelect.value, paramsContainer);
    });
  }

  /**
   * Update event parameters UI
   */
  private availableEvents: EventDefinition[] = EVENTS;

  private updateEventParamsUI(eventName: string, container: HTMLElement): void {
    // Clear existing params
    container.innerHTML = "";
    if (!eventName) return;

    // Find the event definition
    const event = this.availableEvents.find(
      (e: EventDefinition) => e.name === eventName,
    );
    if (!event || !event.params.length) return;

    // Create a form for each parameter
    event.params.forEach((param: EventParam) => {
      const group = document.createElement("div");
      group.className = "space-y-1";

      const label = document.createElement("label");
      label.className = "block text-sm font-medium text-gray-700";
      label.textContent = `${param.name}${param.required ? " *" : ""} (${param.type})`;

      let input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

      if (param.type === "boolean") {
        const select = document.createElement("select");
        select.className = "w-full p-2 border border-gray-300 rounded";
        select.innerHTML = `
          <option value="true" ${param.default === true ? "selected" : ""}>true</option>
          <option value="false" ${param.default === false ? "selected" : ""}>false</option>
        `;
        input = select;
      } else if (param.type === "object") {
        const textarea = document.createElement("textarea");
        textarea.className =
          "w-full p-2 border border-gray-300 rounded font-mono text-sm";
        textarea.rows = 3;
        textarea.value = JSON.stringify(param.default || {}, null, 2);
        input = textarea;
      } else {
        const inputEl = document.createElement("input");
        inputEl.type = param.type === "number" ? "number" : "text";
        inputEl.className = "w-full p-2 border border-gray-300 rounded";
        if (param.default !== undefined && param.default !== null) {
          inputEl.value = String(param.default);
        }
        input = inputEl;
      }

      input.id = `param-${param.name}`;
      input.name = param.name; // Add name attribute for lookup
      input.required = Boolean(param.required);

      const description = document.createElement("p");
      description.className = "text-xs text-gray-500";
      description.textContent = param.description || "";

      group.append(label, input, description);
      container.appendChild(group);
    });
  }
}

const deferredWidgets: Parameters<EKGSDK["loadWidget"]>[] = [];
// Initialize the SDK when the script is loaded
const initSDK = () => {
  const sdk = new EKGSDK();

  for (const widget of deferredWidgets) {
    sdk.loadWidget(...widget);
  }

  window.EKGSDK = {
    loadWidget: sdk.loadWidget.bind(sdk),
  };
};

// Add type declaration for the global EKGSDK
declare global {
  interface Window {
    EKGSDK: EKGSDKAPI;
  }
}

window.EKGSDK = {
  loadWidget(...data) {
    deferredWidgets.push(data);
  },
};
// Load tailwindcss into the browser first
const tailwindscript = document.createElement("script");
tailwindscript.onload = function () {
  // Initialize the SDK when the DOM is loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSDK);
  } else {
    initSDK();
  }
};
tailwindscript.src = "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4";
document.head.append(tailwindscript);

export {};
