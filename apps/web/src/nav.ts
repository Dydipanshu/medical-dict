export function navigate(path: string) {
  location.hash = `/${path}`;
}
