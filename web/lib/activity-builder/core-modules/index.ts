export {
  CORE_MODULE_IDS,
  CORE_MODULE_META,
  getCoreModuleMeta,
  isCoreModuleId,
  type CoreModuleId,
  type CoreModuleMeta,
} from "@/lib/activity-builder/core-modules/types";

export {
  listCoreModules,
  getCoreModule,
  compileCoreModule,
  exportCoreModuleToLessonPlayer,
  type CoreModuleDefinition,
  type CoreModuleAuthoringDocument,
  type CoreModuleCompileBundle,
} from "@/lib/activity-builder/core-modules/registry";
