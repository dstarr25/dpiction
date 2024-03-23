export function env(varname: string) {
    return import.meta.env[`VITE_${varname}`]
}