import type { Metadata } from 'next';
import PaginaLegal from '@/components/v2/PaginaLegal';

export const metadata: Metadata = {
  title: 'Política de Privacidad — MAYA LEX IA',
  description:
    'Cómo MAYA LEX IA PINEL HN recopila, usa y protege los datos personales y documentos de sus usuarios en Honduras.',
};

const VIGENCIA = '23 de septiembre de 2026';

export default function Page() {
  return (
    <PaginaLegal titulo="Política de Privacidad" vigenciaDesde={VIGENCIA}>
      <section>
        <h2>1. Responsable del tratamiento</h2>
        <p>
          MAYA LEX IA PINEL HN es operada por el Abogado Fredy Omar Pinel Flores, con ejercicio profesional en
          Choluteca, Honduras. Para cualquier consulta sobre esta política o sobre sus datos personales, puede
          escribir a <a href="mailto:abogadofredypinel.firmalegal@gmail.com">abogadofredypinel.firmalegal@gmail.com</a>.
        </p>
      </section>

      <section>
        <h2>2. Datos que recopilamos</h2>
        <p>Recopilamos las siguientes categorías de datos según el uso que usted haga de la plataforma:</p>
        <ul>
          <li>Datos de cuenta: nombre, correo electrónico y contraseña (almacenada de forma cifrada).</li>
          <li>Datos de uso: consultas realizadas al asistente, historial de conversación y métricas de actividad dentro de la plataforma.</li>
          <li>Documentos e instrumentos que usted cargue para análisis o extracción de contenido.</li>
          <li>Datos de facturación necesarios para procesar suscripciones (gestionados por nuestro procesador de pagos, no almacenamos números de tarjeta).</li>
          <li>Datos técnicos y de navegación (dirección IP, tipo de dispositivo, páginas visitadas) mediante analítica web.</li>
        </ul>
      </section>

      <section>
        <h2>3. Cómo usamos sus datos</h2>
        <p>Usamos los datos recopilados para:</p>
        <ul>
          <li>Prestar el servicio: procesar sus consultas jurídicas y generar respuestas y análisis de documentos.</li>
          <li>Administrar su cuenta y su suscripción, incluyendo el plan gratuito.</li>
          <li>Mejorar la calidad y cobertura de la plataforma.</li>
          <li>Comunicarnos con usted sobre su cuenta, cambios en el servicio o esta política.</li>
          <li>Cumplir obligaciones legales y prevenir fraude o uso indebido del servicio.</li>
        </ul>
      </section>

      <section>
        <h2>4. Aislamiento de instrumentos privados</h2>
        <p>
          Los documentos e instrumentos que usted carga a la plataforma se procesan de forma aislada: nunca
          alimentan el corpus jurídico compartido ni las respuestas que reciben otros usuarios. Este aislamiento
          opera a nivel de arquitectura y base de datos, no como una promesa de configuración manual.
        </p>
      </section>

      <section>
        <h2>5. Con quién compartimos datos</h2>
        <p>
          No vendemos sus datos personales. Compartimos información únicamente con proveedores necesarios para
          operar el servicio, bajo sus propios compromisos de confidencialidad:
        </p>
        <ul>
          <li>Proveedor de inteligencia artificial (Anthropic, Claude AI) para procesar y generar respuestas a sus consultas.</li>
          <li>Proveedor de base de datos e infraestructura (Supabase) para almacenamiento seguro de cuentas, documentos y consultas.</li>
          <li>Procesador de pagos (PayPal) para gestionar suscripciones y cobros recurrentes.</li>
          <li>Proveedor de correo transaccional (Resend) para notificaciones de cuenta.</li>
          <li>Google Analytics para métricas agregadas de uso del sitio.</li>
        </ul>
        <p>
          Podremos divulgar información cuando la ley hondureña lo exija o para proteger los derechos, la
          seguridad o la propiedad de MAYA LEX IA PINEL HN o de terceros.
        </p>
      </section>

      <section>
        <h2>6. Conservación de datos</h2>
        <p>
          Conservamos sus datos mientras su cuenta permanezca activa y durante el período adicional necesario
          para cumplir obligaciones legales, contables o de resolución de disputas. Puede solicitar la eliminación
          de su cuenta y de los documentos asociados en cualquier momento.
        </p>
      </section>

      <section>
        <h2>7. Sus derechos</h2>
        <p>Usted puede solicitarnos en cualquier momento, escribiendo al correo indicado en la sección 1:</p>
        <ul>
          <li>Acceso a los datos personales que tenemos sobre usted.</li>
          <li>Rectificación de datos inexactos o incompletos.</li>
          <li>Eliminación de su cuenta, sus documentos y sus datos personales.</li>
          <li>Exportación de sus datos en un formato razonable.</li>
        </ul>
        <p>Responderemos su solicitud en un plazo razonable, verificando previamente su identidad.</p>
      </section>

      <section>
        <h2>8. Seguridad</h2>
        <p>
          Aplicamos controles de acceso a nivel de base de datos, cifrado en tránsito y aislamiento de instrumentos
          privados descrito en la sección 4. Ningún sistema es infalible; si detectamos un incidente que afecte
          sus datos, se lo notificaremos conforme a la ley aplicable.
        </p>
      </section>

      <section>
        <h2>9. Menores de edad</h2>
        <p>
          La plataforma está dirigida a profesionales del derecho, estudiantes de derecho y usuarios adultos.
          No está diseñada para ser usada por menores de edad sin supervisión, y no recopilamos deliberadamente
          datos de menores.
        </p>
      </section>

      <section>
        <h2>10. Cambios a esta política</h2>
        <p>
          Podemos actualizar esta política para reflejar cambios en el servicio o en la normativa aplicable.
          Publicaremos la fecha de vigencia actualizada al inicio de esta página.
        </p>
      </section>

      <section>
        <h2>11. Contacto</h2>
        <p>
          Para cualquier duda sobre esta Política de Privacidad, escriba a{' '}
          <a href="mailto:abogadofredypinel.firmalegal@gmail.com">abogadofredypinel.firmalegal@gmail.com</a>.
        </p>
      </section>
    </PaginaLegal>
  );
}
