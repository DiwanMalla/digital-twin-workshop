/**
 * External Knowledge Integration
 * Provides real-time information beyond the vector database
 */

export interface ExternalKnowledgeResponse {
  answer: string;
  source: string;
  confidence: number;
}

/**
 * Get current date and time information
 */
export function getCurrentDateTime(
  query: string
): ExternalKnowledgeResponse | null {
  const timeKeywords = ["time", "date", "today", "now", "current", "what day"];
  const isTimeQuery = timeKeywords.some((keyword) =>
    query.toLowerCase().includes(keyword)
  );

  if (!isTimeQuery) return null;

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return {
    answer: `Right now it's ${timeStr} on ${dateStr}.`,
    source: "system_time",
    confidence: 1.0,
  };
}

/**
 * Handle mathematical calculations
 */
export function calculateMath(query: string): ExternalKnowledgeResponse | null {
  const mathKeywords = [
    "calculate",
    "what is",
    "how much",
    "+",
    "-",
    "*",
    "/",
    "multiply",
    "divide",
    "add",
    "subtract",
  ];
  const hasMathKeyword = mathKeywords.some((keyword) =>
    query.toLowerCase().includes(keyword)
  );

  if (!hasMathKeyword) return null;

  // Extract math expression (simple patterns)
  const patterns = [
    /(\d+\.?\d*)\s*([\+\-\*\/])\s*(\d+\.?\d*)/,
    /what is (\d+\.?\d*)\s*(plus|minus|times|divided by)\s*(\d+\.?\d*)/i,
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      let num1 = parseFloat(match[1]);
      let num2 = parseFloat(match[3]);
      let operator = match[2].toLowerCase();
      let result: number;

      // Convert word operators to symbols
      const operatorMap: Record<string, string> = {
        plus: "+",
        minus: "-",
        times: "*",
        "divided by": "/",
      };
      operator = operatorMap[operator] || operator;

      switch (operator) {
        case "+":
          result = num1 + num2;
          break;
        case "-":
          result = num1 - num2;
          break;
        case "*":
          result = num1 * num2;
          break;
        case "/":
          result = num1 / num2;
          break;
        default:
          continue;
      }

      return {
        answer: `${num1} ${operator} ${num2} = ${result}`,
        source: "calculator",
        confidence: 1.0,
      };
    }
  }

  return null;
}

/**
 * Provide definitions and explanations
 */
export function getDefinition(query: string): ExternalKnowledgeResponse | null {
  const defKeywords = [
    "what is",
    "what does",
    "define",
    "meaning of",
    "full form",
    "abbreviation",
  ];
  const hasDefKeyword = defKeywords.some((keyword) =>
    query.toLowerCase().includes(keyword)
  );

  if (!hasDefKeyword) return null;

  // Common abbreviations and tech terms
  const definitions: Record<string, string> = {
    ai: "AI stands for Artificial Intelligence - the simulation of human intelligence by machines.",
    ml: "ML stands for Machine Learning - a subset of AI where systems learn from data.",
    api: "API stands for Application Programming Interface - a way for software to communicate.",
    ui: "UI stands for User Interface - the visual elements users interact with.",
    ux: "UX stands for User Experience - how users feel when using a product.",
    html: "HTML stands for HyperText Markup Language - the standard language for web pages.",
    css: "CSS stands for Cascading Style Sheets - used to style HTML elements.",
    json: "JSON stands for JavaScript Object Notation - a lightweight data format.",
    rest: "REST stands for Representational State Transfer - an architectural style for APIs.",
    crud: "CRUD stands for Create, Read, Update, Delete - basic database operations.",
    sql: "SQL stands for Structured Query Language - used to manage databases.",
    git: "Git is a distributed version control system for tracking code changes.",
    github:
      "GitHub is a platform for hosting and collaborating on Git repositories.",
    npm: "npm stands for Node Package Manager - the package manager for JavaScript.",
    url: "URL stands for Uniform Resource Locator - a web address.",
    http: "HTTP stands for HyperText Transfer Protocol - the foundation of data communication on the web.",
    https: "HTTPS stands for HTTP Secure - encrypted version of HTTP.",
    ssl: "SSL stands for Secure Sockets Layer - encryption protocol (now TLS).",
    tls: "TLS stands for Transport Layer Security - cryptographic protocol for secure communication.",
    dns: "DNS stands for Domain Name System - translates domain names to IP addresses.",
    ip: "IP stands for Internet Protocol - the address system of the internet.",
    tcp: "TCP stands for Transmission Control Protocol - ensures reliable data delivery.",
    udp: "UDP stands for User Datagram Protocol - fast but unreliable data transmission.",
    seo: "SEO stands for Search Engine Optimization - improving website visibility in search results.",
    saas: "SaaS stands for Software as a Service - software delivered over the internet.",
    paas: "PaaS stands for Platform as a Service - cloud platform for developing applications.",
    iaas: "IaaS stands for Infrastructure as a Service - virtualized computing resources.",
    aws: "AWS stands for Amazon Web Services - a comprehensive cloud computing platform.",
    gcp: "GCP stands for Google Cloud Platform - Google's cloud computing services.",
    azure: "Azure is Microsoft's cloud computing platform and services.",
    docker:
      "Docker is a platform for developing and running applications in containers.",
    kubernetes:
      "Kubernetes (K8s) is a container orchestration platform for automating deployment.",
    devops:
      "DevOps combines software development and IT operations for faster delivery.",
    cicd: "CI/CD stands for Continuous Integration/Continuous Deployment - automated software delivery.",
    agile:
      "Agile is an iterative approach to software development emphasizing flexibility.",
    scrum:
      "Scrum is an Agile framework with sprints, stand-ups, and iterative development.",
    mvp: "MVP stands for Minimum Viable Product - a product with core features for early users.",
    jwt: "JWT stands for JSON Web Token - a compact way to securely transmit information.",
    oauth: "OAuth is an open standard for access delegation and authorization.",
    regex: "Regex (Regular Expression) is a pattern for matching text strings.",
    ide: "IDE stands for Integrated Development Environment - software for coding (like VS Code).",
    cli: "CLI stands for Command Line Interface - text-based interface for commands.",
    gui: "GUI stands for Graphical User Interface - visual interface with windows and buttons.",
    cdn: "CDN stands for Content Delivery Network - distributed servers for faster content delivery.",
    orm: "ORM stands for Object-Relational Mapping - converts data between databases and objects.",
    webhook: "A webhook is an automated message sent when an event occurs.",
    microservice:
      "Microservices are small, independent services that work together.",
    monolith:
      "A monolithic application is a single, unified software architecture.",
    frontend:
      "Frontend is the client-side part of an application that users interact with.",
    backend:
      "Backend is the server-side part that handles logic, databases, and APIs.",
    fullstack: "Full-stack refers to both frontend and backend development.",
    framework:
      "A framework is a pre-built structure for developing applications.",
    library: "A library is a collection of reusable code functions.",
    repository:
      "A repository (repo) is a storage location for code and version history.",
    commit: "A commit is a saved snapshot of changes in version control.",
    branch:
      "A branch is an independent line of development in version control.",
    merge: "Merge combines changes from different branches.",
    "pull request": "A pull request (PR) is a proposal to merge code changes.",
    "code review": "Code review is examining code for quality before merging.",
    debugging: "Debugging is finding and fixing errors in code.",
    refactoring:
      "Refactoring is improving code structure without changing behavior.",
    deployment: "Deployment is releasing software to a production environment.",
    production:
      "Production is the live environment where users access the application.",
    staging: "Staging is a pre-production environment for testing.",
    localhost:
      "Localhost (127.0.0.1) refers to your own computer in networking.",
    port: "A port is a communication endpoint for network services.",
    endpoint: "An endpoint is a specific URL where an API can be accessed.",
    middleware:
      "Middleware is software that connects different applications or services.",
    cache: "Cache is temporary storage for frequently accessed data.",
    session: "A session maintains user state across multiple requests.",
    cookie: "A cookie is small data stored by websites in your browser.",
    token:
      "A token is a piece of data used for authentication or authorization.",
    encryption:
      "Encryption converts data into code to prevent unauthorized access.",
    hashing:
      "Hashing converts data into a fixed-size string (one-way function).",
    algorithm:
      "An algorithm is a step-by-step procedure for solving a problem.",
    "data structure": "A data structure organizes and stores data efficiently.",
    async:
      "Async (asynchronous) means operations that don't block code execution.",
    promise:
      "A Promise represents a future value from an asynchronous operation.",
    callback:
      "A callback is a function passed to another function to be executed later.",
    event:
      "An event is an action that occurs in the system (click, load, etc.).",
    listener: "A listener waits for and responds to specific events.",
    component: "A component is a reusable, self-contained piece of UI.",
    props:
      "Props are arguments passed to components (like function parameters).",
    state: "State is data that changes over time in an application.",
    hook: "A hook is a function that lets you use features in functional components.",
    render: "Render means displaying content on the screen.",
    dom: "DOM stands for Document Object Model - the structure of a web page.",
    "virtual dom":
      "Virtual DOM is a lightweight copy of the DOM for efficient updates.",
    spa: "SPA stands for Single Page Application - loads once and updates dynamically.",
    ssr: "SSR stands for Server-Side Rendering - HTML generated on the server.",
    csr: "CSR stands for Client-Side Rendering - HTML generated in the browser.",
    ssg: "SSG stands for Static Site Generation - HTML generated at build time.",
    responsive: "Responsive design adapts to different screen sizes.",
    "mobile first":
      "Mobile-first design starts with mobile layout then scales up.",
    breakpoint:
      "A breakpoint defines when a layout changes for different screen sizes.",
    flexbox: "Flexbox is a CSS layout system for responsive designs.",
    grid: "CSS Grid is a 2D layout system for complex designs.",
    typescript: "TypeScript is JavaScript with type safety and better tooling.",
    jsx: "JSX is a syntax extension that lets you write HTML-like code in JavaScript.",
    babel:
      "Babel is a JavaScript compiler that converts modern JS to older versions.",
    webpack: "Webpack is a module bundler for JavaScript applications.",
    vite: "Vite is a fast build tool and development server.",
    eslint:
      "ESLint is a tool for identifying and fixing JavaScript code issues.",
    prettier: "Prettier is a code formatter for consistent code style.",
    test: "Testing verifies that code works as expected.",
    "unit test": "Unit tests verify individual functions or components.",
    "integration test":
      "Integration tests verify how different parts work together.",
    e2e: "E2E (End-to-End) tests simulate real user scenarios.",
    mock: "A mock is a fake version of code used for testing.",
    bug: "A bug is an error or flaw in software.",
    hotfix: "A hotfix is a quick patch for a critical bug in production.",
    "tech debt":
      "Technical debt is the cost of quick solutions that need refactoring later.",
    scalability: "Scalability is the ability to handle increased load.",
    optimization: "Optimization improves performance and efficiency.",
    latency: "Latency is the delay before data transfer begins.",
    throughput: "Throughput is the amount of data processed in a given time.",
    bandwidth: "Bandwidth is the maximum data transfer rate.",
    "api key":
      "An API key is a unique identifier for authenticating API requests.",
    "environment variable":
      "Environment variables store configuration outside code.",
    dotenv: "dotenv loads environment variables from a .env file.",
  };

  // Extract the term being asked about
  const queryLower = query.toLowerCase();
  for (const [term, definition] of Object.entries(definitions)) {
    if (queryLower.includes(term)) {
      return {
        answer: definition,
        source: "knowledge_base",
        confidence: 0.95,
      };
    }
  }

  return null;
}

/**
 * Provide location information about Diwan
 */
export function getLocationInfo(
  query: string
): ExternalKnowledgeResponse | null {
  const locationKeywords = [
    "where are you",
    "your location",
    "where do you live",
    "where from",
    "location",
  ];
  const isLocationQuery = locationKeywords.some((keyword) =>
    query.toLowerCase().includes(keyword)
  );

  if (!isLocationQuery) return null;

  return {
    answer:
      "I'm based in Nepal, and I work as a Full-Stack Developer. I'm available for remote opportunities globally!",
    source: "profile_location",
    confidence: 1.0,
  };
}

/**
 * Handle weather queries (placeholder - can integrate real API later)
 */
export function getWeatherInfo(
  query: string
): ExternalKnowledgeResponse | null {
  const weatherKeywords = [
    "weather",
    "temperature",
    "forecast",
    "rain",
    "sunny",
    "cold",
    "hot",
  ];
  const isWeatherQuery = weatherKeywords.some((keyword) =>
    query.toLowerCase().includes(keyword)
  );

  if (!isWeatherQuery) return null;

  return {
    answer:
      "I don't have access to real-time weather data yet, but you can check weather.com or your local weather service for current conditions!",
    source: "weather_placeholder",
    confidence: 0.5,
  };
}

/**
 * Main function to check all external knowledge sources
 */
export function getExternalKnowledge(
  query: string
): ExternalKnowledgeResponse | null {
  // Try each knowledge source in order of confidence
  const sources = [
    getCurrentDateTime,
    calculateMath,
    getLocationInfo,
    getDefinition,
    getWeatherInfo,
  ];

  for (const source of sources) {
    const result = source(query);
    if (result) return result;
  }

  return null;
}
