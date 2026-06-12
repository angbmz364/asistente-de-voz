import { addHomework, createGroupsBySize, getClassInfo, getClassInfoContext, getGroups, getHomework } from "./database";

export type ProcessedInstruction = {
  prompt: string;
  contextText: string;
  groups?: Array<{
    name: string;
    members: string[];
  }>;
};

const SPANISH_NUMBER_WORDS: Record<string, number> = {
  cero: 0,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  dieciséis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
};

const normalizeGroupSizeToken = (token: string): number | null => {
  const normalized = token.toLowerCase().trim();

  if (/^\d+$/.test(normalized)) {
    const value = Number(normalized);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  return SPANISH_NUMBER_WORDS[normalized] ?? null;
};

const extractGroupSize = (transcript: string): number | null => {
  const hasGroupKeyword = /(?:grupo(?:s)?|groups?)/i.test(transcript);

  if (!hasGroupKeyword) {
    return null;
  }

  const digitMatch = transcript.match(/(\d+)/);
  if (digitMatch) {
    return normalizeGroupSizeToken(digitMatch[1]);
  }

  const wordMatch = transcript.match(/\b(?:cero|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciseis|dieciséis|diecisiete|dieciocho|diecinueve|veinte)\b/i);
  if (wordMatch) {
    return normalizeGroupSizeToken(wordMatch[0]);
  }

  return null;
};

const isScheduleRequest = (transcript: string): boolean =>
  /horario|schedule|clases?(?: del día| de hoy)?|programaci[oó]n/i.test(transcript);

const isClassPetRequest = (transcript: string): boolean =>
  /mascota(?: del salón| de la clase)?|animal(?: del salón| de la clase)?/i.test(transcript);

const isTimeRequest = (transcript: string): boolean =>
  /hora|qué hora|que hora|current time|time/i.test(transcript);

const isCourseRequest = (transcript: string): boolean =>
  /curso|cursos|materias|clases del d[ií]a|qu[eé] clases|que clases|clases hoy/i.test(transcript);

const isGroupQuery = (transcript: string): boolean =>
  /(?:mostrar|ver|listar|qué|que|cuáles?) .*grupos?|grupos? (?:existentes|creados|actuales|mostrar|ver)/i.test(transcript);

const isHomeworkSaveRequest = (transcript: string): boolean =>
  /(?:dejar|poner|agregar|añadir|guardar|anotar|anota).*tarea|tarea.*(?:para|hasta|por|de|:)/i.test(transcript);

const isHomeworkQuery = (transcript: string): boolean =>
  /(?:qué|que|mostrar|mostrame|tengo).*tareas?|tareas? (?:pendientes|que hay|hay)|tarea\?/i.test(transcript);

const getCurrentDateContext = (): string => {
  const now = new Date();
  const dateText = now.toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeText = now.toLocaleTimeString("es-PE", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `Hoy es ${dateText} y son las ${timeText}.`;
};

const hasCourseDetails = (text: string): boolean =>
  /matem[aá]ticas|comunicaci[oó]n|ciencias|educaci[oó]n f[ií]sica|ingl[eé]s|historia|arte/i.test(text);

const buildClassScheduleContext = async (): Promise<string> => {
  const info = await getClassInfo();
  const baseContext = await getClassInfoContext();
  const scheduleText = info.schedule
    ? `Horario: ${info.schedule}.`
    : "Horario: Lunes a viernes 7:20 AM a 2:30 PM.";
  const courseText = hasCourseDetails(info.schedule)
    ? ""
    : "Cursos del día (aproximados): Matemáticas, Comunicación, Ciencias y Educación Física.";

  return [baseContext, scheduleText, courseText].filter(Boolean).join(" ");
};

const getPetAndScheduleContext = async (): Promise<string> => {
  const info = await getClassInfo();
  const scheduleText = info.schedule
    ? `Horario: ${info.schedule}.`
    : "Horario: Lunes a viernes 7:20 AM a 2:30 PM.";
  const petText = info.classPet ? `Mascota de clase: ${info.classPet}.` : "";
  return [petText, scheduleText].filter(Boolean).join(" ");
};

const extractHomeworkDescription = (transcript: string): string => {
  const match = transcript.match(/tarea(?:s)?(?:\s*(?:de|del|:))?\s*(.+)$/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return transcript;
};

const extractHomeworkDueDate = (transcript: string): string | null => {
  const dueMatch = transcript.match(/(?:para|hasta el|entrega(?: el)?|vence(?: el)?|vencimiento(?: el)?)\s+(.+)$/i);
  return dueMatch ? dueMatch[1].trim() : null;
};

const isTutorRequest = (transcript: string): boolean =>
  /profesor|tutor|teacher/i.test(transcript);

export const processUserInstruction = async (
  transcript: string
): Promise<ProcessedInstruction> => {
  const sanitized = transcript.trim();
  const lowerTranscript = sanitized.toLowerCase();
  const wantsHomeworkSave = isHomeworkSaveRequest(lowerTranscript);
  const wantsHomeworkQuery = isHomeworkQuery(lowerTranscript);
  const wantsGroupQuery = isGroupQuery(lowerTranscript);
  const wantsTimeRequest = isTimeRequest(lowerTranscript);

  const groupSize = extractGroupSize(sanitized);

  if (groupSize) {
    const groups = await createGroupsBySize(groupSize);
    const groupSummary = groups
      .map((group) => `${group.name}: ${group.members.join(", ")}`)
      .join(". ");

    const prompt = `El usuario pidió: "${sanitized}". Esta solicitud ya se procesó localmente y se generaron los siguientes grupos: ${groupSummary}. Responde de manera natural dictando los grupos y integrantes usando esta información.`;

    return {
      prompt,
      contextText: groupSummary,
      groups: groups.map((group) => ({
        name: group.name,
        members: group.members,
      })),
    };
  }

  if (wantsGroupQuery) {
    const groups = await getGroups();
    const groupSummary = groups.length
      ? groups.map((group) => `${group.name}: ${group.members.join(", ")}`).join(". ")
      : "No hay grupos creados.";

    const prompt = `El usuario preguntó: "${sanitized}". Estos son los grupos registrados: ${groupSummary}. Responde de manera natural y concisa.`;

    return {
      prompt,
      contextText: groupSummary,
    };
  }

  if (wantsHomeworkSave) {
    const description = extractHomeworkDescription(sanitized);
    const dueDate = extractHomeworkDueDate(sanitized);
    const homework = await addHomework(description, dueDate);
    const prompt = `El usuario pidió guardar una tarea: "${homework.description}"${homework.dueDate ? ` para ${homework.dueDate}` : ""}. Registra esto localmente y confirma en lenguaje natural.`;

    return {
      prompt,
      contextText: `Tarea guardada: ${homework.description}${homework.dueDate ? `, fecha de entrega ${homework.dueDate}` : ""}`,
    };
  }

  if (wantsHomeworkQuery) {
    const homework = await getHomework();
    const homeworkSummary = homework.length
      ? homework
          .map((item) =>
            item.dueDate
              ? `${item.description} (para ${item.dueDate})`
              : item.description
          )
          .join(". ")
      : "No hay tareas registradas.";
    const prompt = `El usuario preguntó: "${sanitized}". Estas son las tareas registradas: ${homeworkSummary}. Responde de forma natural.`;

    return {
      prompt,
      contextText: homeworkSummary,
    };
  }

  if (isClassPetRequest(lowerTranscript)) {
    const contextText = await getPetAndScheduleContext();
    const prompt = `El usuario preguntó: "${sanitized}". Usa únicamente esta información: ${contextText}. Responde específicamente sobre la mascota del salón y, si es relevante, menciona el horario. No inventes profesores ni cursos.`;

    return {
      prompt,
      contextText,
    };
  }

  if (isScheduleRequest(lowerTranscript)) {
    const info = await getClassInfo();
    const schedule = info.schedule ? info.schedule : "Lunes a viernes 7:20 AM a 2:30 PM";
    const prompt = `El usuario preguntó: "${sanitized}". Usa únicamente este horario: ${schedule}. Responde de forma natural y breve. No añadas cursos, profesores ni información adicional.`;

    return {
      prompt,
      contextText: `Horario: ${schedule}`,
    };
  }

  if (isCourseRequest(lowerTranscript)) {
    const info = await getClassInfo();
    const scheduleText = info.schedule ? `Horario: ${info.schedule}.` : "Horario: Lunes a viernes 7:20 AM a 2:30 PM.";
    const courseText = hasCourseDetails(info.schedule)
      ? ""
      : "Cursos del día (aproximados): Matemáticas, Comunicación, Ciencias y Educación Física.";

    const contextText = [scheduleText, courseText].filter(Boolean).join(" ");
    const dateContext = getCurrentDateContext();
    const prompt = `El usuario preguntó: "${sanitized}". ${dateContext} Usa únicamente la información de clase: ${contextText}. Si te pregunta por profesores, indica que no hay datos disponibles en el sistema y evita inventar nombres. Responde de forma natural y breve.`;

    return {
      prompt,
      contextText,
    };
  }

  if (isTutorRequest(lowerTranscript) || wantsTimeRequest) {
    const contextText = await buildClassScheduleContext();
    const dateContext = getCurrentDateContext();
    const prompt = `El usuario preguntó: "${sanitized}". ${dateContext} Usa únicamente la información de clase para responder: ${contextText}. Si te pregunta por las clases del día, provee el horario y los cursos disponibles sin inventar profesores ni detalles no soportados. Responde de forma natural y breve.`;

    return {
      prompt,
      contextText,
    };
  }

  return {
    prompt: `El usuario preguntó: "${sanitized}". Responde de forma natural, concisa y amena en el contexto educativo. Si necesitas agregar detalles pedagógicos, usa tu conocimiento académico para explicarlo de forma clara.`,
    contextText: "",
  };
};
