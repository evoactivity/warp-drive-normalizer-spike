import { pluralize } from '@warp-drive/utilities/string';
import { serialize } from 'jsonapi-fractal';

// Utility functions for type checking
const isObject = (value) =>
  value && typeof value === 'object' && !Array.isArray(value);
const isPrimitive = (value) =>
  typeof value === 'string' || typeof value === 'number';

/**
 * Detects the resource type from API response data by checking for known type keys
 * Looks for both singular (e.g., 'article') and plural (e.g., 'articles') forms
 * @param {string[]} knownTypes - Array of known resource types from schema
 * @param {Object} data - API response data to analyze
 * @returns {string} The detected resource type or 'unknown'
 */
function detectResourceType(knownTypes, data) {
  return (
    knownTypes.find((type) => data[type] || data[pluralize(type)]) || 'unknown'
  );
}

/**
 * Determines if the API response contains a collection of resources
 * Checks for plural keys that contain arrays (e.g., 'articles': [...])
 * @param {string[]} knownTypes - Array of known resource types
 * @param {Object} data - API response data to check
 * @returns {boolean} True if response contains a collection
 */
function isCollectionResponse(knownTypes, data) {
  return knownTypes.some((type) => data[pluralize(type)]);
}

/**
 * Extracts a unique identifier from a resource object or primitive value
 * Tries multiple common ID fields in order of preference
 * @param {Object|string|number} resource - The resource to extract ID from
 * @returns {string} The extracted ID as a string
 */
function extractResourceId(resource) {
  if (isPrimitive(resource)) return String(resource);
  return resource.id || resource.slug || resource.username || resource.name;
}

/**
 * Transforms primitive arrays into proper resource objects
 * Handles API responses where resources are simple strings/numbers instead of objects
 * Uses schema to determine the appropriate property name for the primitive value
 * @param {Object} data - The API response data
 * @param {string} type - The resource type being normalized
 * @param {Object} schema - The schema object to determine field names
 * @returns {Object} The data with primitive arrays converted to object arrays
 */
function normalizeResourceData(data, type, schema) {
  const pluralKey = pluralize(type);
  const resourceArray = data[pluralKey];

  if (!Array.isArray(resourceArray)) return data;

  // Transform primitive arrays into objects
  if (resourceArray.some(isPrimitive)) {
    // Try to determine the appropriate property name from schema
    let propertyName = 'value'; // default fallback

    if (schema) {
      try {
        const fields = Array.from(schema.fields({ type }).values());
        // Look for common property names that might hold the primitive value
        const nameField = fields.find(
          (field) =>
            field.kind === 'field' &&
            ['name', 'title', 'label', 'text', 'value'].includes(field.name)
        );
        if (nameField) {
          propertyName = nameField.name;
        }
      } catch {
        // If schema lookup fails, keep default
      }
    }

    data[pluralKey] = resourceArray.map((item) => ({
      id: String(item),
      [propertyName]: item,
    }));
  }

  return data;
}

/**
 * Extracts relationship field names from the schema for a given resource type
 * Safely handles missing or malformed schemas by returning empty array
 * @param {Object} schema - The schema object containing field definitions
 * @param {string} type - The resource type to get relationships for
 * @returns {string[]} Array of relationship field names
 */
function getSchemaRelationships(schema, type) {
  try {
    return Array.from(schema.fields({ type }).values())
      .filter((field) => ['belongsTo', 'hasMany'].includes(field.kind))
      .map((field) => field.name);
  } catch {
    return [];
  }
}

/**
 * Ensures all relationship objects have valid IDs before serialization
 * Generates IDs for nested relationship objects that are missing them
 * @param {Object} resource - The main resource object
 * @param {string[]} relationships - Array of relationship field names to process
 */
function ensureRelationshipIds(resource, relationships) {
  relationships.forEach((relName) => {
    const relData = resource[relName];
    if (!relData) return;

    const items = Array.isArray(relData) ? relData : [relData];
    items.forEach((item) => {
      if (isObject(item) && !item.id) {
        item.id = extractResourceId(item);
      }
    });
  });
}

/**
 * Adds JSON:API compliant links to relationship objects
 * Creates 'related' and 'self' links for each relationship following the JSON:API spec
 * @param {Object} relationships - The relationships object to add links to
 * @param {string} baseUrl - Base URL for generating links
 * @param {string} resourceId - ID of the parent resource
 */
function addJsonApiLinks(relationships, baseUrl, resourceId) {
  if (!relationships) return;

  Object.entries(relationships).forEach(([relName, relationship]) => {
    relationship.links = {
      related: `${baseUrl}/${resourceId}/${relName}`,
      self: `${baseUrl}/${resourceId}/relationships/${relName}`,
    };
  });
}

/**
 * Polymorphic function that maps resource types using RELATIONSHIP_TYPE_MAP
 * Handles both included resources (arrays) and relationship data (objects)
 * Why: jsonapi-fractal uses property names as types, but we need correct resource types
 * @param {Array|Object} data - Either array of included resources or relationships object
 * @returns {Array|Object|undefined} The data with corrected types or undefined if empty
 */
function mapTypes(data, relationshipTypeMap) {
  if (!data) return data;

  // Handle array of items (included resources)
  if (Array.isArray(data)) {
    if (!data.length) return undefined;

    return data.map((item) => ({
      ...item,
      type: relationshipTypeMap[item.type] || item.type,
    }));
  }

  // Handle relationships object
  if (isObject(data)) {
    Object.entries(data).forEach(([relName, relationship]) => {
      const targetType = relationshipTypeMap[relName];
      if (targetType && relationship.data) {
        const dataItems = Array.isArray(relationship.data)
          ? relationship.data
          : [relationship.data];
        dataItems.forEach((item) => (item.type = targetType));
      }
    });
  }

  return data;
}

/**
 * Serializes a single resource using jsonapi-fractal with proper configuration
 * Handles ID extraction, relationship processing, and inclusion settings
 * @param {Object} resource - The resource object to serialize
 * @param {string} type - The resource type
 * @param {string[]} relationships - Array of relationship field names
 * @param {boolean} hasRelationships - Whether this resource type has relationships
 * @returns {Object} Serialized JSON:API resource object
 */
function serializeResource(resource, type, relationships, hasRelationships) {
  const id = extractResourceId(resource);

  if (hasRelationships) {
    ensureRelationshipIds(resource, relationships);
  }

  return serialize({ ...resource, id }, type, {
    relationships: hasRelationships ? relationships : undefined,
    included: hasRelationships,
  });
}

/**
 * Recursive function that normalizes both collections and single resources
 * Uses recursion to handle collections by processing each item individually
 * Base case: single resource serialization with relationship processing
 * @param {Object} document - The API response document to normalize
 * @param {string} type - The detected resource type
 * @param {string[]} relationships - Array of relationship field names
 * @param {boolean} hasRelationships - Whether this resource type has relationships
 * @param {string} url - Base URL for generating JSON:API links
 * @returns {Object} Normalized JSON:API response
 */
function normalizeResourceRecursive(
  document,
  type,
  relationships,
  hasRelationships,
  url,
  relationshipTypeMap
) {
  const knownTypes = [type]; // We already know the type, so just pass it

  // Check if this is a collection using the existing utility
  if (isCollectionResponse(knownTypes, document)) {
    const pluralType = pluralize(type);

    // Handle collection: recursively process each item
    const resources = document[pluralType].map((resource) => {
      // Create a single resource wrapper and recurse
      const singleResourceData = { [type]: resource };
      return normalizeResourceRecursive(
        singleResourceData,
        type,
        relationships,
        hasRelationships,
        url,
        relationshipTypeMap
      );
    });

    const result = {
      data: resources.map((r) => r.data),
    };

    if (hasRelationships) {
      result.included = resources.flatMap((r) => r.included || []);
    }

    return result;
  }

  // Handle single resource (base case)
  const resource = document[type];
  const result = serializeResource(
    resource,
    type,
    relationships,
    hasRelationships
  );

  if (hasRelationships) {
    addJsonApiLinks(result.data.relationships, url, result.data.id);
    mapTypes(result.data.relationships, relationshipTypeMap);
    result.included = mapTypes(result.included, relationshipTypeMap);
  }

  return result;
}

/**
 * Main entry point for normalizing API responses to JSON:API format
 * Orchestrates the entire normalization process from detection to serialization
 * Handles both primitive arrays (like tags) and complex object structures
 * @param {Object} item - The raw API response data
 * @param {Object} request - The request context containing store and URL
 * @param {Object} relationshipTypeMap - Maps relationship names to correct resource types
 * @returns {Object} Complete JSON:API normalized response
 */
export function normalizeResource(item, request, relationshipTypeMap) {
  const {
    store: { schema },
    url,
  } = request;
  const knownTypes = [...schema._schemas.keys()];
  const type = detectResourceType(knownTypes, item);

  const document = normalizeResourceData(item, type, schema);

  const relationships = getSchemaRelationships(schema, type);
  const hasRelationships = relationships.length > 0;

  return normalizeResourceRecursive(
    document,
    type,
    relationships,
    hasRelationships,
    url,
    relationshipTypeMap
  );
}
