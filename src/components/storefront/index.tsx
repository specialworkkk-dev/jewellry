import type { StorefrontTemplateId } from "@/lib/storefront-template";
import type { TemplateProps } from "./shared";
import { TemplateEmerald } from "./TemplateEmerald";
import { TemplateNoir } from "./TemplateNoir";
import { TemplatePearl } from "./TemplatePearl";
import { TemplateRose } from "./TemplateRose";
import { TemplateRoyal } from "./TemplateRoyal";

const TEMPLATES: Record<StorefrontTemplateId, (props: TemplateProps) => React.ReactNode> = {
  1: TemplateRoyal,
  2: TemplateNoir,
  3: TemplateRose,
  4: TemplateEmerald,
  5: TemplatePearl,
};

export function StorefrontTemplate({ template, ...props }: TemplateProps & { template: StorefrontTemplateId }) {
  return <>{TEMPLATES[template](props)}</>;
}
