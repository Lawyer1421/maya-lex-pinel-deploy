/**
 * lib/ai-gateway/shadow/nombres-inequivocos.ts
 * G6-C: nombres de pila INEQUÍVOCOS (hispanos, centroamericanos, garífunas/mayas de uso común, bíblicos, extranjeros frecuentes).
 * «Inequívoco» = no es además una palabra común del español jurídico: se excluyen a propósito amparo, mercedes, pilar, consuelo,
 * caridad, soledad, dolores, esperanza, victoria, rosa, flor, luz, paz, reina, blanca, gloria, jesús, salvador, santos, germán,
 * cesar (verbo), julio/abril (meses), marco, justo, pastor, clemente, severo y similares.
 *
 * Un nombre de pila inequívoco, en cualquier combinación de mayúsculas/minúsculas y con o sin tildes, marca la consulta como
 * posible dato personal (el nombre público de un autor, caso o institución se enmascara antes con entidades-publicas.ts).
 * Conocimiento común, no datos de nadie. Cubre MUCHOS nombres, no todos: un nombre fuera de la lista y sin otra señal sigue pasando
 * (riesgo residual medido en tests/privacy/benchmark-g6.ts).
 */
const sinTildes = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const LISTA =
  'abel abelardo abigail abimael abner abraham adalberto adan adela adelaida adelina adolfo adriana adrian agapito agustin ' +
  'aida aide aldo alejandra alejandro alexa alexander alexis alfonso alfredo alicia alirio alonso alvaro amanda amarilis ' +
  'amilcar anabel anabella anastasio andrea aneth angela angelica anibal anselmo anthony antonella aquiles ariel arleth armida ' +
  'arnoldo arturo asdrubal astrid aurelio aurora axel azucena balbina baltazar barbara bartolo basilio beatriz ' +
  'belen benedicto benito berenice berlis bernabe bernardo bertha betsy bianca bladimir bonifacio brenda brian brayan ' +
  'briceida bryan bruno calixto camila camilo carina carlota casimiro catalina catarino cayetano ' +
  'celia celina celso ceferino cipriano ciro claribel clarisa clemencia cleofas clotilde constanza corina cornelio ' +
  'cosme cresencia crescencio crisanto cristina cristobal cruz-maria cynthia damaris damian dania danilo dariela dario deborah ' +
  'delfina delmy deyanira diana diego dilan dimas dionisio dolores-maria donaldo dora doris dorotea douglas ' +
  'duvan edelmira edeltrudis edgard edilberto edith edmundo edna edson edwin efrain eladio eleazar elda eleonora eliana ' +
  'eliezer elisa elisabeth eliseo eloisa eloy elsy elvia elvira emelina emerson emiliano emilio emilse engracia enmanuel ' +
  'enrique epifanio erasmo erlinda ermelinda ernesto eroteida esdras esmeralda estanislao estefani estefania estela ester ' +
  'estevan eufemio eugenia eugenio eulalia eulogio eusebio eustaquia evangelina evaristo ezequiel fabian fabricio faustino ' +
  'fausto federico felicita felipe felix fermin fidel fidelina filomena fiorela flavia flavio florencia florentino floridalma ' +
  'florinda francisca franco fredis froilan gabino gabriel gaspar genaro genesis geovany geraldina gerardo gerson gilberto ' +
  'gilma gioconda giovanni gisela gladis gladys godofredo gonzalo gregorio griselda guillermo gustavo haroldo ' +
  'hazel heber heidy heidi heriberto herlinda hermelinda hermes hermogenes hernan hilario hilda hipolito honorio horacio ' +
  'hortensia humberto ibrahim idalia ignacio ileana imelda ines iris irvin isabela isaias isidro isis ismael ' +
  'israel italo itzel ivania ivette ivonne jacinta jacinto jaime janeth janette jasmin javiera jeannette jenifer jennifer ' +
  'jeremias jeovany jeronimo jessenia jhon jhonny joaquin johana johanna jonathan jordan josefa josefina josias jovany ' +
  'juana-maria judith julia juliana julian julieta justina karina karol kareli kelvin kimberly kristhel lazaro leandra ' +
  'leandro leidy lenin lenny leobardo leocadia leonardo leonidas leonor leopoldo lesbia lesvia lester lidieth lilian ' +
  'liliam linda lisandro lisbeth lissette lizeth lizbeth lizandro lourdes-maria lucas luciano lucila lucio lupita luzmila ' +
  'macario maclovio magaly maira manase marbin marcela marcelino marcelo marcio margoth maribel marilu ' +
  'mariano marilyn mariela marisol marisela marlen marlene marlin marlon martina martin matias mauro maximino ' +
  'mayerlin mayra melania melvin mercedes-maria merlin micaela milton mirna mirta misael moises monica narciso ' +
  'natalia natividad nahum nayeli nazario nehemias nelly nemesio nereida nery nestor nicasio nicole nidia nilda nohemi ' +
  'nohemy noemi norberto norma nubia obdulio octavio odalis odalys olivia olvin onesimo orestes orlando osmin osvaldo ' +
  'otoniel ottoniel pablo pamela pascual patricio paulina paulino pedro petrona petronila plutarco policarpo ' +
  'porfirio priscila prudencio quintin rafaela ramiro raquel rebeca regina reinaldo remigio renan reyna reynaldo ricarda ' +
  'rigoberto rina ritza roberta robin rocael rodolfo rodrigo rolando romulo ronald rosalba rosalia rosaura ' +
  'rosendo rosibel rubenia rufino rusbel saira salomon samara samira sandro santiago saul sebastian selena ' +
  'selvin serafin serapio sergio servando silvano silverio silvestre simeon simon siomara sixto sonia stefany stephanie ' +
  'suyapa tania tatiana telesforo telma teodoro teofilo tiburcio timoteo tito tomasa toribio tranquilino ' +
  'transito ubaldo ulises ursula valentina valentin valeria vanesa venancio veronica vicenta vicente victor-manuel ' +
  'violeta virgilio virginia vivian wanda waldina wendi wendy wilfredo wilian william wilmer wilson wiston xiomara ' +
  'yadira yamileth yanira yaneth yasmin yeni yenifer yeny yesenia yeymi yessica yolani yolanda yolany yorleny yovany ' +
  'yuri zacarias zaida zenaida zoila zulema ' +
  'fernanda lorena lorna sabrina yamilet katherine evelyn evelin jazmin giselle noelia alondra ximena yara yuliana dayana daniela jocelyn nathaly nataly ashley brittany cindy dayra emely fatima fiorella joselyn karelys keily kenia leyla madeline marcia marisa melany michelle nadia naomi odessa perla rosmery samanta sarahi scarleth shirley sheila tamara vera wendolyn xenia yaritza yoselin zaira adonay alan alder aldair cristofer christopher dennis derlis dixon edder elder elmer fabio geovanny gerber heyler jefferson joshua maynor mynor nixon noel obed oliver orlin osman ronny rudy tony wilder yefri yeferson yimi ' +
  // nombres de origen maya, lenca, garífuna y otros de uso en la región
  'ixchel ixmucane kukulkan tecun tzunun nayely nahuel quetzalli yaxkin tupac lempi waslala anaya tolupan ' +
  // nombres extranjeros frecuentes
  'ingrid johansson matteo chen olufemi hiroshi jurgen amelie dmitri priya sean';

/** Nombres de pila que además son palabras comunes del español jurídico o geografía: se excluyen siempre, también como variante. */
const EXCLUIDOS: ReadonlySet<string> = new Set([
  'milagro', 'candida', 'amado', 'inocente', 'perfecta', 'benigno', 'violeta', 'celeste', 'marina', 'trinidad', 'concepcion', 'ascension',
  'rosario', 'guadalupe', 'transito', 'segundo', 'domingo', 'israel', 'belen', 'maximo', 'marcial', 'candelaria', 'tomas', 'dulce', 'amparo',
  'mercedes', 'pilar', 'consuelo', 'caridad', 'soledad', 'dolores', 'esperanza', 'victoria', 'rosa', 'flor', 'luz', 'paz', 'reina', 'blanca',
  'gloria', 'jesus', 'salvador', 'santos', 'german', 'cesar', 'julio', 'abril', 'marco', 'justo', 'pastor', 'clemente', 'severo', 'natividad',
]);
const BASE = LISTA.split(' ').filter((n) => n && !n.includes('-')).map(sinTildes).filter((n) => !EXCLUIDOS.has(n));
/** Formas generadas que son palabras comunes del español: nunca se agregan como variante de género. */
const NO_VARIANTE: ReadonlySet<string> = new Set([
  'albo', 'ano', 'casa', 'cosa', 'lisa', 'liso', 'roso', 'bella', 'bello', 'clara', 'claro', 'justa', 'justo', 'santa', 'santo', 'pura', 'puro',
  'dora', 'doro', 'mata', 'mato', 'pasa', 'paso', 'vida', 'sana', 'sano', 'lucha', 'moza', 'mozo', 'mina', 'mino', 'nina', 'nino', 'norma',
  'perfecto', 'prudencia', 'sola', 'solo', 'cruzo', 'mono', 'mona', 'hermano', 'hermana', 'primo', 'prima', 'tio', 'tia', 'cura', 'curo',
]);
const variantes = BASE.flatMap((n) => (n.endsWith('o') ? [`${n.slice(0, -1)}a`] : n.endsWith('a') ? [`${n.slice(0, -1)}o`] : []));
export const NOMBRES_INEQUIVOCOS: ReadonlySet<string> = new Set([...BASE, ...variantes.filter((v) => !NO_VARIANTE.has(v) && !EXCLUIDOS.has(v))]);

/** ¿Hay un nombre de pila inequívoco entre las palabras del texto (sin tildes, sin importar mayúsculas)? */
export function contieneNombreDePila(texto: string): boolean {
  for (const palabra of sinTildes(texto).match(/[a-zñ]+/g) ?? []) if (NOMBRES_INEQUIVOCOS.has(palabra)) return true;
  return false;
}
