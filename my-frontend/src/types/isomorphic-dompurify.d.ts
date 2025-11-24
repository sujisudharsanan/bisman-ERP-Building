declare module 'isomorphic-dompurify' {
  const DOMPurify: {
    sanitize(html: string, options?: any): string;
  };
  export default DOMPurify;
}
