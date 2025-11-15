import { WebDriver } from 'selenium-webdriver';

export interface BrowserSession {
  sessionId: string;
  browserId: string;
  driver: WebDriver;
  createdAt: Date;
  lastUsed: Date;
  isActive: boolean;
  badge?: string; // Store badge text to persist across navigations - identifies what Cursor is doing
}

// Enhanced Scenario interface with variable substitution
export interface Scenario {
  scenarioId: string;
  name: string;
  sessionId: string; // The session ID this scenario was recorded in
  description?: string;
  steps: ScenarioStep[];
  variables?: Record<string, string>; // Default variable values
  expectedResult?: {
    finalUrl?: string;
    title?: string;
    element?: string;
  };
  metadata: {
    totalSteps: number;
    duration: number;
    createdAt: string;
    lastModified: string;
    lastUsed?: string;
    variablesUsed: string[];
  };
}

export interface ScenarioStep {
  action: 'navigate' | 'click' | 'type' | 'wait' | 'wait_for_page_change' | 'screenshot' | 'fill_form' | 'select_option' | 'execute_script';
  timestamp: number;
  filename?: string; // For screenshot action
  selector?: string;
  by?: string;
  value?: string;
  url?: string;
  pattern?: string; // For wait_for_page_change
  timeout?: number;
  fields?: Record<string, { selector: string; value: string }>; // For fill_form
  option?: { by: 'text' | 'value' | 'index'; text?: string; value?: string; index?: number }; // For select_option
  script?: string; // For execute_script
  args?: string[]; // For execute_script
}

