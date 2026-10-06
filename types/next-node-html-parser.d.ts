declare module "next/dist/compiled/node-html-parser" {
  const NodeType: {
    ELEMENT_NODE: 1;
    TEXT_NODE: 3;
    COMMENT_NODE: 8;
  };

  interface ParserNode {
    nodeType: number;
    tagName?: string;
    childNodes?: ParserNode[];
    text?: string;
  }

  export { NodeType, ParserNode };

  export function parse(html: string): ParserNode;
}
