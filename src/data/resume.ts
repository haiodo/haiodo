import { parse } from "yaml";
import source from "../../cv/resume.yaml?raw";

export const resume = parse(source);
