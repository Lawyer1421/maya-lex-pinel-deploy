import type { Metadata } from 'next';
import PaginaLegal from '@/components/v2/PaginaLegal';

export const metadata: Metadata = {
  title: 'Términos y Condiciones — MAYA LEX IA',
  description:
    'Términos y condiciones de uso de MAYA LEX IA PINEL HN, plataforma de inteligencia artificial jurídica para Honduras.',
};

const VIGENCIA = '23 de septiembre de 2026';

export default function Page() {
  return (
    <PaginaLegal titulo="Términos y Condiciones" vigenciaDesde={VIGENCIA}>
      <section>
        <h2>1. Aceptación de los términos</h2>
        <p>
          Al crear una cuenta o usar MAYA LEX IA PINEL HN ("Maya Lex", "la plataforma"), usted acepta estos
          Términos y Condiciones y nuestra{' '}
          <a href="/privacidad">Política de Privacidad</a>. Si no está de acuerdo, no debe usar la plataforma.
        </p>
      </section>

      <section>
        <h2>2. Descripción del servicio</h2>
        <p>
          Maya Lex es una herramienta de apoyo a la investigación y el análisis jurídico para el derecho
          hondureño, impulsada por inteligencia artificial. Maya Lex <strong>no sustituye el criterio profesional
          de un abogado colegiado</strong>, no constituye asesoría legal formal y no crea una relación
          abogado-cliente. Las respuestas generadas deben ser revisadas y validadas por un profesional del
          derecho antes de utilizarse en cualquier trámite, gestión o proceso judicial.
        </p>
      </section>

      <section>
        <h2>3. Cuentas y elegibilidad</h2>
        <ul>
          <li>Debe proporcionar información veraz al registrarse y mantener actualizada su información de cuenta.</li>
          <li>Es responsable de mantener la confidencialidad de sus credenciales de acceso.</li>
          <li>El servicio está dirigido a abogados, notarios, estudiantes de derecho, docentes y otros profesionales o interesados en el derecho hondureño.</li>
        </ul>
      </section>

      <section>
        <h2>4. Planes y pagos</h2>
        <ul>
          <li>Ofrecemos un plan gratuito con un número limitado de consultas diarias, sin necesidad de tarjeta.</li>
          <li>Los planes de pago se facturan de forma recurrente a través de PayPal, según el plan y la periodicidad seleccionados al momento de la suscripción.</li>
          <li>Puede cancelar su suscripción en cualquier momento desde su cuenta; la cancelación surte efecto al final del período ya pagado.</li>
          <li>No se realizan reembolsos por períodos parcialmente utilizados, salvo que la ley aplicable indique lo contrario.</li>
          <li>Nos reservamos el derecho de ajustar precios de planes futuros, notificando con antelación razonable.</li>
        </ul>
      </section>

      <section>
        <h2>5. Uso aceptable</h2>
        <p>Al usar la plataforma, usted se compromete a no:</p>
        <ul>
          <li>Usar el servicio para fines ilícitos o para asesorar en la comisión de un delito.</li>
          <li>Intentar vulnerar, sobrecargar o realizar ingeniería inversa de la plataforma o sus sistemas de seguridad.</li>
          <li>Cargar documentos que no tenga derecho a compartir o que infrinjan derechos de terceros.</li>
          <li>Revender o redistribuir el acceso a la plataforma sin autorización expresa.</li>
        </ul>
      </section>

      <section>
        <h2>6. Contenido y documentos del usuario</h2>
        <p>
          Usted conserva la titularidad de los documentos e instrumentos que carga a la plataforma. Nos otorga
          una licencia limitada para procesarlos únicamente con el fin de prestarle el servicio solicitado
          (análisis, extracción de contenido, generación de respuestas). Como se describe en nuestra{' '}
          <a href="/privacidad">Política de Privacidad</a>, sus documentos privados nunca alimentan el corpus
          compartido ni las respuestas de otros usuarios.
        </p>
      </section>

      <section>
        <h2>7. Propiedad intelectual</h2>
        <p>
          El software, diseño, marca "MAYA LEX" y los materiales editoriales de la plataforma son propiedad de
          MAYA LEX IA PINEL HN o se usan bajo licencia. No se permite copiar, modificar o distribuir estos
          materiales sin autorización previa por escrito.
        </p>
      </section>

      <section>
        <h2>8. Exclusión de garantías y limitación de responsabilidad</h2>
        <p>
          La plataforma se ofrece "tal cual" y "según disponibilidad". No garantizamos que las respuestas
          generadas sean exactas, completas o estén libres de errores, ni que reflejen el estado más reciente de
          la normativa hondureña en todos los casos. La página de{' '}
          <a href="/cobertura-juridica">cobertura jurídica</a> describe el estado real de verificación del corpus.
        </p>
        <p>
          En la máxima medida permitida por la ley, MAYA LEX IA PINEL HN no será responsable por daños directos,
          indirectos, incidentales o consecuentes derivados del uso de la plataforma, incluyendo decisiones
          profesionales, judiciales o notariales tomadas con base en su contenido sin la revisión de un
          profesional del derecho.
        </p>
      </section>

      <section>
        <h2>9. Terminación</h2>
        <p>
          Podemos suspender o cancelar su cuenta si incumple estos Términos, incluyendo el uso indebido descrito
          en la sección 5. Usted puede cerrar su cuenta en cualquier momento contactándonos o desde su panel de
          cuenta.
        </p>
      </section>

      <section>
        <h2>10. Ley aplicable y jurisdicción</h2>
        <p>
          Estos Términos se rigen por las leyes de la República de Honduras. Cualquier controversia derivada de
          su uso de la plataforma se someterá a los tribunales competentes de Choluteca, Honduras, salvo que la
          ley aplicable disponga otra cosa.
        </p>
      </section>

      <section>
        <h2>11. Modificaciones a estos términos</h2>
        <p>
          Podemos actualizar estos Términos y Condiciones para reflejar cambios en el servicio o en la normativa
          aplicable. Publicaremos la fecha de vigencia actualizada al inicio de esta página. El uso continuado de
          la plataforma después de una actualización constituye la aceptación de los nuevos términos.
        </p>
      </section>

      <section>
        <h2>12. Contacto</h2>
        <p>
          Para cualquier duda sobre estos Términos y Condiciones, escriba a{' '}
          <a href="mailto:abogadofredypinel.firmalegal@gmail.com">abogadofredypinel.firmalegal@gmail.com</a>.
        </p>
      </section>
    </PaginaLegal>
  );
}
