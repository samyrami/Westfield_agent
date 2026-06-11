import { Section } from "../Section";
import { Playground } from "./Playground";

export function LiveDemo() {
  return (
    <Section
      id="demo"
      className="pt-10 md:pt-14"
      eyebrow="Maia en vivo"
      title={
        <>
          Habla con Maia <span className="gradient-text-primary">ahora mismo</span>.
        </>
      }
    >
      <Playground />
    </Section>
  );
}
