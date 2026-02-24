type Object = { [key: string]: unknown };

const isObject = (item: unknown): item is Object =>
  item !== null && typeof item === 'object' && !Array.isArray(item);

/**
 * Deep merge two objects by overriding target with fields in source.
 * It returns a new object and doesn't modify any object in place since
 * it deep clones the target object first.
 */
export const deepMerge = <T>(target: T, source: unknown, level = 0): T => {
  const copyTarget = (level === 0 ? structuredClone(target) : target) as Record<
    string,
    unknown
  >;
  const sourceObj = source as Record<string, unknown>;
  for (const key in sourceObj) {
    if (Object.prototype.hasOwnProperty.call(sourceObj, key)) {
      const sourceValue = sourceObj[key];
      // Assign source value to copyTarget if source value is not an object.
      // Otherwise, call deepMerge recursively to merge all its keys
      if (!isObject(sourceValue)) {
        copyTarget[key] = sourceValue;
      } else {
        if (!isObject(copyTarget[key])) {
          copyTarget[key] = {};
        }
        deepMerge(
          copyTarget[key] as Record<string, unknown>,
          sourceValue as Record<string, unknown>,
          level + 1,
        );
      }
    }
  }
  return copyTarget as T;
};
