
export interface ServerConfig {
    host: string
}

export const getServerConfig = () : ServerConfig => {
    console.log(process.env.REACT_APP_CONFIG)
    if (process.env.REACT_APP_CONFIG === "dev") {
        return {
            host: "http://localhost:5000/"
        }
    } else {
        return {
            host: "https://liff.us-west-2.elasticbeanstalk.com/"
        }
    }
}