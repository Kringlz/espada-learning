import { translate } from "./index";
const messages: Record<string, string> = {
  "Invalid login credentials": "Неверная почта или пароль.",
  "Email not confirmed": "Подтвердите адрес электронной почты.",
  "Failed to fetch":
    "Нет соединения с сервером. Проверьте интернет и повторите попытку.",
  "email rate limit exceeded":
    "Превышен лимит на отправку писем подтверждения. Подождите или настройте свой SMTP в Supabase (Project Settings → Auth → SMTP Settings), затем попробуйте снова.",
  "Token has expired or is invalid":
    "Код неверный или устарел. Запросите новый код и попробуйте снова.",
  "User already registered":
    "Этот email уже зарегистрирован. Войдите в аккаунт.",
  "Error sending confirmation email":
    "Не удалось отправить письмо. Проверьте адрес или повторите позже.",
  "Network request failed":
    "Нет соединения с сервером. Проверьте интернет и повторите попытку.",
  "Your session has expired or your account is disabled.":
    "Сеанс завершён или аккаунт отключён. Войдите снова.",
  "Session expired or account disabled.":
    "Сеанс завершён или аккаунт отключён. Войдите снова.",
  "Staff access required.":
    "Действие доступно только преподавателю или администратору.",
  "Administrator access required.": "Действие доступно только администратору.",
  "Student access required.": "Действие доступно только ученику.",
  "Student access denied.": "У вас нет доступа к этому ученику.",
  "Published records require an audited correction.":
    "Для изменения опубликованной работы внесите исправление с указанием причины.",
  "Unknown template.": "Шаблон работы не найден.",
  "Invalid assessment date.":
    "Укажите корректную дату работы не позднее сегодняшней.",
  "Assessment access denied.":
    "Работа не найдена или недоступна вашему аккаунту.",
  "Record changed. Refresh before publishing.":
    "Работа уже изменена. Обновите данные перед публикацией.",
  "A correction reason is required.": "Укажите причину исправления.",
  "Only your own attempts can be submitted.":
    "Можно отправлять только свои ответы.",
  "Attempt identifier is unavailable.":
    "Не удалось сохранить эту попытку. Обновите данные.",
  "Three different answers required.": "Ответьте на три разных вопроса.",
  "Invalid independent answer.": "Проверьте ответы самостоятельной проверки.",
  "Only your own activity can be saved.":
    "Можно сохранять только свою учебную работу.",
  "Student access and assignment reason required.":
    "Выберите доступного вам ученика и укажите причину задания.",
  "Template in use. Create a new version.":
    "Шаблон уже используется. Создайте новую версию.",
  "Template metadata and questions required.":
    "Заполните сведения о работе и добавьте задания.",
  "Unique question IDs required.": "Идентификаторы заданий должны различаться.",
  "Invalid question mapping or maximum mark.":
    "Проверьте темы заданий и максимальные баллы.",
  "Topic, objective, lesson and example required.":
    "Заполните название темы, цель, объяснение и пример.",
  "Question bank has attempts and is immutable.":
    "На эти вопросы уже отвечали. Создайте новую версию вопросов.",
  "Invalid learning question.":
    "Проверьте вопрос, четыре варианта ответа и объяснение.",
  "Class name required.": "Укажите название группы.",
  "Invalid teacher.": "Выберите существующего преподавателя.",
  "Invalid student.": "Выберите существующего ученика.",
  "Cannot remove your own administrator access.":
    "Нельзя отключить собственный доступ администратора.",
  "Existing roles cannot be changed here.":
    "Роль существующего аккаунта здесь изменить нельзя.",
  "A deletion request is required.": "Нужен запрос ученика на удаление.",
  "Invalid marking status.": "Выберите корректный статус проверки.",
  "Mark outside the allowed range.":
    "Балл должен быть от нуля до максимума за задание.",
  "Unanswered must receive zero.":
    "Задание без ответа оценивается в ноль баллов.",
  "Unmarked and not administered must have null marks.":
    "Непроверенным и непроведённым заданиям нельзя назначать баллы.",
  "Mark all administered questions before publication.":
    "Перед публикацией проверьте все проведённые задания.",
  "At least one result is required.": "Нужен результат хотя бы одного задания.",
};
export function errorMessage(error: unknown): string {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : typeof error === "object" && error && "message" in error
          ? String(error.message)
          : "";
  const translated = messages[message] ?? translate(message);
  if (translated !== message || /[А-Яа-яЁё]/.test(translated))
    return translated;
  return "Не удалось выполнить действие. Проверьте данные и соединение, затем повторите попытку.";
}
