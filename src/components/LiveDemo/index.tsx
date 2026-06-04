import { Section } from "../Section";
import { Playground } from "./Playground";

export function LiveDemo() {
  return (
    <Section
      id="demo"
      className="pt-32 md:pt-40"
      eyebrow="Maia en vivo"
      title={
        <>
          Habla con Maia <span className="gradient-text-primary">ahora mismo</span>.
        </>
      }
      description="Esto no es un mock: la respuesta la genera el modelo en tiempo real. Empezás con la primera pregunta de introspección sobre el caso Etsy de Mariola Onetti. Si te quedás sin ideas, las sugerencias debajo del chat te dan un punto de partida."
    >
      <Playground />
    </Section>
  );
}
