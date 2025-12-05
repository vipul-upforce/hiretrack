#!/usr/bin/env node

/**
 * OpenAPI/Swagger Generator for Next.js API Routes
 * 
 * This script scans all API route files in src/app/api/.../route.js or route.ts
 * and generates an OpenAPI 3.0 specification with Swagger UI.
 * 
 * Usage: node generate-openapi.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to import parser libraries
let parser, traverse;
let hasBabel = false;

try {
  const babelParser = await import('@babel/parser');
  const babelTraverse = await import('@babel/traverse');
  parser = babelParser.default || babelParser;
  traverse = (babelTraverse.default || babelTraverse).default || babelTraverse;
  hasBabel = true;
  console.log('✓ Using Babel parser for accurate code analysis');
} catch (e) {
  console.warn('⚠️  Warning: @babel/parser not found. Install with: npm install --save-dev @babel/parser @babel/traverse');
  console.warn('   Using fallback regex-based parsing (less accurate)');
}

/**
 * Recursively find all route files matching pattern
 */
function findRouteFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findRouteFiles(filePath, fileList);
    } else if (file === 'route.js' || file === 'route.ts') {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Convert file path to API endpoint path
 */
function pathToEndpoint(filePath) {
  // Extract path from src/app/api/.../route.ts
  const apiIndex = filePath.indexOf('/api/');
  if (apiIndex === -1) return null;
  
  let endpoint = filePath.substring(apiIndex + 4); // +4 for '/api'
  endpoint = endpoint.replace(/\/route\.(js|ts)$/, '');
  
  // Handle dynamic routes [id] -> {id}
  endpoint = endpoint.replace(/\[([^\]]+)\]/g, '{$1}');
  
  // Remove leading/trailing slashes and ensure it starts with /
  endpoint = '/' + endpoint.split('/').filter(Boolean).join('/');
  
  return endpoint || '/';
}

/**
 * Extract tags from endpoint path (folder structure)
 */
function extractTags(endpoint) {
  const parts = endpoint.split('/').filter(Boolean);
  if (parts.length > 0) {
    return [parts[0]]; // Use first segment as tag
  }
  return ['api'];
}

/**
 * Parse code using Babel AST
 */
function parseWithBabel(code, filePath) {
  try {
    const isTypeScript = filePath.endsWith('.ts');
    const ast = parser.parse(code, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins: [
        'typescript',
        'jsx',
        'asyncGenerators',
        'classProperties',
        'objectRestSpread',
        'decorators-legacy',
        'dynamicImport',
        'nullishCoalescingOperator',
        'optionalChaining'
      ]
    });

    const routeInfo = {
      methods: [],
      bodyFields: [],
      queryParams: [],
      usesCookies: false,
      cookieNames: []
    };

    const processedMethods = new Set();
    
    traverse(ast, {
      // Find exported HTTP method functions
      ExportNamedDeclaration(path) {
        const declaration = path.node.declaration;
        if (declaration && declaration.type === 'FunctionDeclaration') {
          const funcName = declaration.id?.name;
          if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(funcName)) {
            if (!processedMethods.has(funcName)) {
              routeInfo.methods.push(funcName);
              processedMethods.add(funcName);
              
              // Analyze function body for req usage
              analyzeFunctionBody(declaration.body, routeInfo);
            }
          }
        }
      },
      
      // Handle export async function GET/POST etc.
      FunctionDeclaration(path) {
        if (path.node.id && ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(path.node.id.name)) {
          const parent = path.parent;
          if (parent && parent.type === 'ExportNamedDeclaration') {
            const funcName = path.node.id.name;
            if (!processedMethods.has(funcName)) {
              routeInfo.methods.push(funcName);
              processedMethods.add(funcName);
              analyzeFunctionBody(path.node.body, routeInfo);
            }
          }
        }
      }
    });

    return routeInfo;
  } catch (error) {
    console.warn(`Error parsing ${filePath}: ${error.message}`);
    return parseWithRegex(code, filePath);
  }
}

/**
 * Analyze function body for req.body, req.query, cookies
 */
function analyzeFunctionBody(body, routeInfo) {
  if (!body || body.type !== 'BlockStatement') return;
  
  const traverseNode = (node) => {
    if (!node) return;
    
    // Check for req.json() or request.json() - body parsing
    if (node.type === 'VariableDeclarator' && node.init) {
      if (node.init.type === 'AwaitExpression' && 
          node.init.argument && 
          node.init.argument.type === 'CallExpression') {
        const callExpr = node.init.argument;
        if (callExpr.callee && 
            (callExpr.callee.property?.name === 'json' || 
             (callExpr.callee.type === 'MemberExpression' && callExpr.callee.property?.name === 'json'))) {
          
          // Check for destructuring
          if (node.id && node.id.type === 'ObjectPattern') {
            node.id.properties.forEach(prop => {
              if (prop.type === 'ObjectProperty' && prop.key) {
                const key = prop.key.name || prop.key.value;
                if (key && !routeInfo.bodyFields.find(f => f.name === key)) {
                  routeInfo.bodyFields.push({
                    name: key,
                    type: 'string' // Default, can be enhanced
                  });
                }
              }
            });
          }
        }
      }
    }
    
    // Check for req.cookies.get() or cookies().get()
    if (node.type === 'CallExpression') {
      const callee = node.callee;
      if (callee) {
        // Pattern: req.cookies.get("auth_token") or request.cookies.get("auth_token")
        if (callee.type === 'MemberExpression' && 
            callee.property?.name === 'get') {
          const object = callee.object;
          if (object && object.type === 'MemberExpression' &&
              object.property?.name === 'cookies') {
            const arg = node.arguments?.[0];
            if (arg && (arg.type === 'StringLiteral' || arg.type === 'TemplateLiteral')) {
              const cookieName = arg.value || (arg.quasis?.[0]?.value?.raw);
              if (cookieName) {
                routeInfo.usesCookies = true;
                if (!routeInfo.cookieNames.includes(cookieName)) {
                  routeInfo.cookieNames.push(cookieName);
                }
              }
            }
          }
        }
        
        // Pattern: cookies().get("auth_token")
        if (callee.type === 'MemberExpression' &&
            callee.object?.type === 'CallExpression' &&
            callee.object.callee?.name === 'cookies' &&
            callee.property?.name === 'get') {
          const arg = node.arguments?.[0];
          if (arg && (arg.type === 'StringLiteral' || arg.type === 'TemplateLiteral')) {
            const cookieName = arg.value || (arg.quasis?.[0]?.value?.raw);
            if (cookieName) {
              routeInfo.usesCookies = true;
              if (!routeInfo.cookieNames.includes(cookieName)) {
                routeInfo.cookieNames.push(cookieName);
              }
            }
          }
        }
      }
    }
    
    // Check for searchParams.get() - query params
    if (node.type === 'CallExpression') {
      const callee = node.callee;
      if (callee && callee.type === 'MemberExpression' && 
          callee.property?.name === 'get') {
        // Check if it's searchParams.get()
        const object = callee.object;
        if (object && object.type === 'MemberExpression' &&
            object.property?.name === 'searchParams') {
          // Extract parameter name from arguments
          const arg = node.arguments?.[0];
          if (arg && (arg.type === 'StringLiteral' || arg.type === 'TemplateLiteral')) {
            const paramName = arg.value || (arg.quasis?.[0]?.value?.raw);
            if (paramName && !routeInfo.queryParams.find(p => p.name === paramName)) {
              routeInfo.queryParams.push({ name: paramName, type: 'string' });
            }
          }
        }
      }
    }
    
    // Check for new URL() pattern
    if (node.type === 'VariableDeclarator' && node.init) {
      if (node.init.type === 'NewExpression' &&
          node.init.callee?.name === 'URL') {
        // Mark that URL is used, actual params extracted via searchParams.get() above
        // This is a placeholder - actual extraction happens in searchParams.get() calls
      }
    }
    
    // Recursively traverse children
    for (const key in node) {
      if (key !== 'parent' && key !== 'leadingComments' && key !== 'trailingComments') {
        const child = node[key];
        if (Array.isArray(child)) {
          child.forEach(traverseNode);
        } else if (child && typeof child === 'object') {
          traverseNode(child);
        }
      }
    }
  };
  
  traverseNode(body);
}

/**
 * Fallback regex-based parsing (less accurate but works without Babel)
 */
function parseWithRegex(code, filePath) {
  const routeInfo = {
    methods: [],
    bodyFields: [],
    queryParams: [],
    usesCookies: false,
    cookieNames: []
  };

  // Find exported HTTP methods
  const methodRegex = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(/g;
  let match;
  while ((match = methodRegex.exec(code)) !== null) {
    routeInfo.methods.push(match[1]);
  }

  // Find body destructuring patterns - multiple variations
  const bodyPatterns = [
    /const\s*\{\s*([^}]+)\s*\}\s*=\s*await\s+(req|request)\.json\(\)/g,
    /var\s*\{\s*([^}]+)\s*\}\s*=\s*await\s+(req|request)\.json\(\)/g,
    /let\s*\{\s*([^}]+)\s*\}\s*=\s*await\s+(req|request)\.json\(\)/g
  ];
  
  bodyPatterns.forEach(pattern => {
    while ((match = pattern.exec(code)) !== null) {
      const fieldsStr = match[1];
      // Handle nested destructuring and default values
      const fields = fieldsStr.split(',').map(f => {
        const cleaned = f.trim();
        // Remove default values like "name = ''"
        const fieldName = cleaned.split('=')[0].trim();
        // Handle nested destructuring like "user: { name }"
        const parts = fieldName.split(':');
        return parts[parts.length - 1].trim();
      }).filter(f => f);
      
      fields.forEach(field => {
        if (field && !routeInfo.bodyFields.find(f => f.name === field)) {
          routeInfo.bodyFields.push({ name: field, type: 'string' });
        }
      });
    }
  });
  
  // Also check for direct assignment: const data = await req.json()
  const bodyDataRegex = /const\s+(\w+)\s*=\s*await\s+(req|request)\.json\(\)/g;
  while ((match = bodyDataRegex.exec(code)) !== null) {
    // If we see data being used, try to find what properties are accessed
    const varName = match[1];
    const accessRegex = new RegExp(`${varName}\\.(\\w+)`, 'g');
    let accessMatch;
    while ((accessMatch = accessRegex.exec(code)) !== null) {
      const propName = accessMatch[1];
      if (!routeInfo.bodyFields.find(f => f.name === propName)) {
        routeInfo.bodyFields.push({ name: propName, type: 'string' });
      }
    }
  }

  // Find cookie usage
  const cookieRegex = /(req|request)\.cookies\.get\(["']([^"']+)["']\)/g;
  while ((match = cookieRegex.exec(code)) !== null) {
    routeInfo.usesCookies = true;
    if (!routeInfo.cookieNames.includes(match[2])) {
      routeInfo.cookieNames.push(match[2]);
    }
  }

  // Check for cookies() function call
  const cookiesFuncRegex = /cookies\(\)\.get\(["']([^"']+)["']\)/g;
  while ((match = cookiesFuncRegex.exec(code)) !== null) {
    routeInfo.usesCookies = true;
    if (!routeInfo.cookieNames.includes(match[1])) {
      routeInfo.cookieNames.push(match[1]);
    }
  }

  // Find query params - searchParams.get() calls
  const searchParamsRegex = /(?:url|searchParams|req\.nextUrl|request\.nextUrl)\.searchParams\.get\(["']([^"']+)["']\)/g;
  while ((match = searchParamsRegex.exec(code)) !== null) {
    const paramName = match[1];
    if (!routeInfo.queryParams.find(p => p.name === paramName)) {
      routeInfo.queryParams.push({ name: paramName, type: 'string' });
    }
  }
  
  // Also check for new URL() pattern
  if (code.includes('new URL') && code.includes('searchParams')) {
    // Try to extract param names from searchParams.get() calls after URL creation
    const urlVarRegex = /const\s+(\w+)\s*=\s*new\s+URL\(/g;
    let urlMatch;
    while ((urlMatch = urlVarRegex.exec(code)) !== null) {
      const urlVar = urlMatch[1];
      const paramAccessRegex = new RegExp(`${urlVar}\\.searchParams\\.get\\(["']([^"']+)["']\\)`, 'g');
      let paramMatch;
      while ((paramMatch = paramAccessRegex.exec(code)) !== null) {
        const paramName = paramMatch[1];
        if (!routeInfo.queryParams.find(p => p.name === paramName)) {
          routeInfo.queryParams.push({ name: paramName, type: 'string' });
        }
      }
    }
  }

  return routeInfo;
}

/**
 * Generate OpenAPI 3.0 specification
 */
function generateOpenAPISpec(routes) {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'HireTrack API',
      version: '1.0.0',
      description: 'Auto-generated API documentation for HireTrack Next.js application'
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://hire.upforce.tech',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'auth_token'
        }
      }
    },
    paths: {}
  };

  // Process each route
  routes.forEach(route => {
    const { endpoint, methods, bodyFields, queryParams, usesCookies, cookieNames, tags } = route;
    
    if (!spec.paths[endpoint]) {
      spec.paths[endpoint] = {};
    }

    methods.forEach(method => {
      const methodLower = method.toLowerCase();
      const operation = {
        summary: `${method} ${endpoint}`,
        tags: tags,
        operationId: `${methodLower}${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`,
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object'
                }
              }
            }
          },
          '400': {
            description: 'Bad Request'
          },
          '401': {
            description: 'Unauthorized'
          },
          '404': {
            description: 'Not Found'
          },
          '500': {
            description: 'Internal Server Error'
          }
        }
      };

      // Add security if cookies are used
      if (usesCookies || cookieNames.length > 0) {
        operation.security = [{ cookieAuth: [] }];
      }

      // Add request body for POST, PUT, PATCH
      if (['POST', 'PUT', 'PATCH'].includes(method) && bodyFields.length > 0) {
        operation.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {}
              }
            }
          }
        };

        bodyFields.forEach(field => {
          operation.requestBody.content['application/json'].schema.properties[field.name] = {
            type: field.type || 'string',
            description: `Field: ${field.name}`
          };
        });

        // Mark required fields (basic heuristic)
        if (bodyFields.length > 0) {
          operation.requestBody.content['application/json'].schema.required = bodyFields.map(f => f.name);
        }
      }

      // Add query parameters
      if (queryParams.length > 0) {
        operation.parameters = queryParams.map(param => ({
          name: param.name,
          in: 'query',
          schema: {
            type: param.type || 'string'
          },
          description: `Query parameter: ${param.name}`,
          required: false
        }));
      }

      // Add path parameters from endpoint
      const pathParamRegex = /\{([^}]+)\}/g;
      let pathMatch;
      const pathParams = [];
      while ((pathMatch = pathParamRegex.exec(endpoint)) !== null) {
        pathParams.push(pathMatch[1]);
      }

      if (pathParams.length > 0) {
        if (!operation.parameters) {
          operation.parameters = [];
        }
        pathParams.forEach(paramName => {
          operation.parameters.push({
            name: paramName,
            in: 'path',
            required: true,
            schema: {
              type: 'string'
            },
            description: `Path parameter: ${paramName}`
          });
        });
      }

      spec.paths[endpoint][methodLower] = operation;
    });
  });

  return spec;
}

/**
 * Generate Swagger UI HTML
 */
function generateSwaggerHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HireTrack API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: "./openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        validatorUrl: null,
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        docExpansion: "list"
      });
    };
  </script>
</body>
</html>`;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting OpenAPI generation...\n');

  const apiDir = path.join(__dirname, 'src', 'app', 'api');
  
  if (!fs.existsSync(apiDir)) {
    console.error(`❌ API directory not found: ${apiDir}`);
    process.exit(1);
  }

  console.log(`📁 Scanning API routes in: ${apiDir}\n`);

  const routeFiles = findRouteFiles(apiDir);
  console.log(`📄 Found ${routeFiles.length} route file(s)\n`);

  const routes = [];

  for (const filePath of routeFiles) {
    try {
      const code = fs.readFileSync(filePath, 'utf-8');
      const endpoint = pathToEndpoint(filePath);
      
      if (!endpoint) {
        console.warn(`⚠️  Skipping ${filePath}: could not extract endpoint`);
        continue;
      }

      console.log(`🔍 Analyzing: ${filePath}`);
      console.log(`   → Endpoint: ${endpoint}`);

      const routeInfo = hasBabel ? parseWithBabel(code, filePath) : parseWithRegex(code, filePath);
      const tags = extractTags(endpoint);

      if (routeInfo.methods.length === 0) {
        console.log(`   ⚠️  No HTTP methods found, skipping`);
        continue;
      }

      console.log(`   ✓ Methods: ${routeInfo.methods.join(', ')}`);
      if (routeInfo.bodyFields.length > 0) {
        console.log(`   ✓ Body fields: ${routeInfo.bodyFields.map(f => f.name).join(', ')}`);
      }
      if (routeInfo.queryParams.length > 0) {
        console.log(`   ✓ Query params: ${routeInfo.queryParams.map(p => p.name).join(', ')}`);
      }
      if (routeInfo.usesCookies) {
        console.log(`   ✓ Uses cookies: ${routeInfo.cookieNames.join(', ')}`);
      }

      routes.push({
        endpoint,
        ...routeInfo,
        tags
      });
    } catch (error) {
      console.error(`❌ Error processing ${filePath}: ${error.message}`);
    }
  }

  console.log(`\n📊 Processed ${routes.length} route(s)\n`);

  // Generate OpenAPI spec
  console.log('📝 Generating OpenAPI specification...');
  const spec = generateOpenAPISpec(routes);

  // Ensure public directory exists
  const publicDir = path.join(__dirname, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Write OpenAPI JSON
  const openapiPath = path.join(publicDir, 'openapi.json');
  fs.writeFileSync(openapiPath, JSON.stringify(spec, null, 2));
  console.log(`✅ Generated: ${openapiPath}`);

  // Write Swagger UI HTML
  const swaggerPath = path.join(publicDir, 'swagger.html');
  fs.writeFileSync(swaggerPath, generateSwaggerHTML());
  console.log(`✅ Generated: ${swaggerPath}`);

  console.log(`\n🎉 OpenAPI generation complete!`);
  console.log(`\n📖 View documentation at: http://localhost:3000/swagger.html`);
  console.log(`   (or open ${swaggerPath} in your browser)\n`);
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

