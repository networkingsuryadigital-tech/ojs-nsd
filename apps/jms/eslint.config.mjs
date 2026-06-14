import nextConfig from "@nsd/eslint-config/next";
import { appLayerRules, domainLayerRules } from "@nsd/eslint-config/boundaries";

const eslintConfig = [...nextConfig, domainLayerRules, appLayerRules];

export default eslintConfig;
