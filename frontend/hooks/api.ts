import { API_URL } from "./config";


export const apiLogin = async (login: string, password: string) => {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, password }),
  });
  return res.json();
};

export const apiGetTasks = async (userId: number) => {
  const res = await fetch(`${API_URL}/tasks/user/${userId}`);
  return res.json();
};

export const apiCompleteTask = async (taskId: number, userId: number) => {
  const res = await fetch(
    `${API_URL}/complete_task/${taskId}?completed_by=${userId}`,
    { method: "POST" }
  );
  return res.json();
};

export const apiGetUser = async (userId: number) => {
  const res = await fetch(`${API_URL}/users/${userId}`);
  return res.json();
};

export const apiAddMember = async (
  parent_id: number,
  member_name: string,
  age: number
) => {
  const res = await fetch(`${API_URL}/create_family_member`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parent_id, member_name, age }),
  });
  return res.json();
};
