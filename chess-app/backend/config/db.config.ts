
export interface DatabaseConfig {
    host: string
    username: string
    password: string
    database: string
    port: number
}

export const getDBConfig = () : DatabaseConfig => {
    //console.log(process.env.CONFIG)
    if (process.env.CONFIG === "dev") {
        return {
            host: "postgres",
            username: "postgres",
            password: "mypassword",
            database: "chessgame",
            port: 5432
        }
    } else {
        return {
            host: process.env.RDS_HOSTNAME!,
            port:  +process.env.RDS_PORT!,
            username: process.env.RDS_USERNAME!,
            password: process.env.RDS_PASSWORD!,
            database: process.env.RDS_DATABASE!
        }
    }
}