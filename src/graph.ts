export type Node = {
    /**
     * Human friendly node's name.
     */
    readonly name: string;
    /**
     * Node's type.
     */
    readonly type: Type;
    /**
     * Human friendly node's description.
     */
    readonly description?: string;
    /**
     * Application, or service technology.
     */
    readonly technology?: string;
    /**
     * Deployment environment for the application, or service.
     */
    readonly deployment?: string;
    /**
     * Node's children.
     */
    readonly nodes?: Node[];
    /**
     * Node's id.
     *
     * It's ignored upon read, but mutated to be compliant with regexp.
     */
    id?: string;
}

/**
 * Node's type.
 */
export enum Type {
    Organisation = "organisation",
    Department = "department",
    Domain = "domain",
    Team = "team",
    Service = "service",
    Application = "application",
    Database = "database",
    Queue = "queue",
}

/**
 * Connection between two Nodes, i.e. graph's edge.
 */
type Link = {
    /**
     * Edge start's Node id.
     */
    readonly from: string;
    /**
     * Edge end's Node id.
     */
    readonly to: string;
    /**
     * Human friendly description of the link between two Nodes.
     */
    readonly description?: string;
    /**
     * Interface technology and protocol, e.g. HTTP/JSON.
     */
    readonly technology?: string;
}

export type graph = {
    readonly nodes: Node[];
    readonly links?: Link[];
}

const isValidNodeIDRegexp = /^([a-zA-Z0-9]+|([a-zA-Z0-9]+\.[a-zA-Z0-9]+)+)$/i;

function isValidLinkNodeID(id: string) {
    return isValidNodeIDRegexp.test(id)
}

function nodeToC4Diagram(node: Node): string {
    function containerSuffix(type: Type.Application | Type.Database | Type.Queue) {
        switch (type) {
            case Type.Database:
                return "Db"
            case Type.Queue:
                return "Queue"
            default:
                return ""
        }
    }

    function nodeName(node: Node): string {
        if (node.name != undefined && node.name != "") {
            return node.name
        }
        return node.id.split(".").slice(-1)[0];
    }

    switch (node.type) {
        case Type.Application:
        case Type.Database:
        case Type.Queue:
            let tech = node.technology;
            if (node.deployment != undefined && node.deployment != "") {
                if (tech != undefined && tech != "") {
                    tech = `${tech}/${node.deployment}`;
                } else {
                    tech = node.deployment;
                }
            }
            return `Container${containerSuffix(node.type)}(${node.id},"${nodeName}","${tech}","${node.description}")`;
        default:
            return `System(${node.id},"${nodeName}","${node.description}")`
    }
}

function linkToC4Diagram(link: Link): string {
    return `Rel(${link.from},${link.to},"${link.description}","${link.technology}")`
}

/**
 * Defines the graph.
 */
export class Graph {
    readonly nodes: Node[]
    readonly links: Link[] = []

    constructor(v: object) {
        const raw: graph = cast(v, r("graph"));

        this.nodes = raw.nodes
        this.mutateID(this.nodes)

        if (raw.links !== undefined) {
            for (const link of raw.links) {
                if (!isValidLinkNodeID(link.from)) {
                    throw new Error("unexpected link's 'from' id");
                }

                if (this.getNodeByID(link.from) === undefined) {
                    throw new Error("node with link's 'from' id not found");
                }

                if (!isValidLinkNodeID(link.to)) {
                    throw new Error("unexpected link's 'to' id");
                }

                if (this.getNodeByID(link.to) === undefined) {
                    throw new Error("node with link's 'to' id not found");
                }
            }

            this.links = raw.links
        }
    }

    defineC4Diagram(id: string): string {
        const n = this.getNodeByID(id);
        if (n === undefined) {
            throw Error("node not found")
        }

        let o = "C4Context";

        const links = this.getLinksByID(id);

        const linkedNodes: Node[] = [];
        for (const link of links) {
            for (const lID of [link.from, link.to]) {
                try {
                    linkedNodes.push(this.getNodeByID(lID)!);
                } catch (e) {
                    throw Error(`linked node with id ${lID} is not found`)
                }
            }
        }

        const c4Links = links.map((link) => linkToC4Diagram(link)).join("\n");

        const selectedNodeC4 = nodeToC4Diagram(n);

        return o;
    }

    private getLinksByID(id: string): Link[] {
        let o: Link[] = [];
        for (const link of this.links) {
            if (link.from == id || link.to == id) {
                o.push(link)
            }
        }
        return o
    }

    getNodeByID(id: string): Node | undefined {
        return getNodeByID(this.nodes, id, "")
    }

    private mutateID(nodes: Node[], root_namespace: string = "") {
        function generateIDUsingName(name: string): string {
            return name.replace(RegExp("[\\s\.\,\!\?\/\\\\:\;\*\$\%\#\"\'\&\(\)\=]+"), "")
        }

        nodes.forEach(node => {
            node.id = generateIDUsingName(node.name);
            if (root_namespace != "") {
                node.id = `${root_namespace}.${node.id}`
            }

            if (node.nodes != undefined) {
                this.mutateID(node.nodes, node.id)
            }
        })
    }
}

function getNodeByID(nodes: Node[], id: string, root_id: string = ""): Node | undefined {
    let id_flag = id.replace(root_id, "");
    if (id_flag.startsWith(".")) {
        id_flag = id_flag.slice(1);
    }
    id_flag = id_flag.split(".")[0];

    if (root_id !== "") {
        id_flag = `${root_id}.${id_flag}`
    }

    const n = nodes.find(n => n.id === id_flag);
    if (id_flag === id) {
        return n
    }
    return getNodeByID(n!.nodes!, id, id_flag)
}

/**
 * GENERATED by https://app.quicktype.io/
 * */
function invalidValue(typ: any, val: any, key: any, parent: any = ''): never {
    const prettyTyp = prettyTypeName(typ);
    const parentText = parent ? ` on ${parent}` : '';
    const keyText = key ? ` for key "${key}"` : '';
    throw Error(`Invalid value${keyText}${parentText}. Expected ${prettyTyp} but got ${JSON.stringify(val)}`);
}

function prettyTypeName(typ: any): string {
    if (Array.isArray(typ)) {
        if (typ.length === 2 && typ[0] === undefined) {
            return `an optional ${prettyTypeName(typ[1])}`;
        } else {
            return `one of [${typ.map(a => {
                return prettyTypeName(a);
            }).join(", ")}]`;
        }
    } else if (typeof typ === "object" && typ.literal !== undefined) {
        return typ.literal;
    } else {
        return typeof typ;
    }
}

function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.json] = {key: p.js, typ: p.typ});
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function transform(val: any, typ: any, getProps: any, key: any = '', parent: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key, parent);
    }

    function transformUnion(typs: any[], val: any): any {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) {
            }
        }
        return invalidValue(typs, val, key, parent);
    }

    function transformEnum(cases: string[], val: any): any {
        if (cases.indexOf(val) !== -1) return val;
        return invalidValue(cases.map(a => {
            return l(a);
        }), val, key, parent);
    }

    function transformArray(typ: any, val: any): any {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue(l("array"), val, key, parent);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue(l("Date"), val, key, parent);
        }
        return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
            return invalidValue(l(ref || "object"), val, key, parent);
        }
        const result: any = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, key, ref);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key, ref);
            }
        });
        return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val, key, parent);
    }
    if (typ === false) return invalidValue(typ, val, key, parent);
    let ref: any = undefined;
    while (typeof typ === "object" && typ.ref !== undefined) {
        ref = typ.ref;
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
        return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty("arrayItems") ? transformArray(typ.arrayItems, val)
                : typ.hasOwnProperty("props") ? transformObject(getProps(typ), typ.additional, val)
                    : invalidValue(typ, val, key, parent);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
}

function l(typ: any) {
    return {literal: typ};
}

function a(typ: any) {
    return {arrayItems: typ};
}

function u(...typs: any[]) {
    return {unionMembers: typs};
}

function o(props: any[], additional: any) {
    return {props, additional};
}

function r(name: string) {
    return {ref: name};
}

const typeMap: any = {
    "graph": o([
        {json: "links", js: "links", typ: u(undefined, a(r("Link")))},
        {json: "nodes", js: "nodes", typ: a(r("Node"))},
    ], "any"),
    "Link": o([
        {json: "description", js: "description", typ: u(undefined, "")},
        {json: "from", js: "from", typ: ""},
        {json: "technology", js: "technology", typ: u(undefined, "")},
        {json: "to", js: "to", typ: ""},
    ], "any"),
    "Node": o([
        {json: "deployment", js: "deployment", typ: u(undefined, "")},
        {json: "description", js: "description", typ: u(undefined, "")},
        {json: "name", js: "name", typ: ""},
        {json: "id", js: "id", typ: u(undefined, "")},
        {json: "nodes", js: "nodes", typ: u(undefined, a(r("Node")))},
        {json: "technology", js: "technology", typ: u(undefined, "")},
        {json: "type", js: "type", typ: r("Type")},
    ], "any"),
    "Type": [
        "application",
        "database",
        "department",
        "domain",
        "organisation",
        "queue",
        "service",
        "team",
    ],
};