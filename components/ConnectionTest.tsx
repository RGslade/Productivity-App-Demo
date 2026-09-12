import NetInfo from "@react-native-community/netinfo";

export function CheckConnection(){ //using Await/async completely breaks the entire software???
    const state = NetInfo.fetch();
    return {
        isConnected: state.then(state => state.isConnected),
        type: state.then(state => state.type),
    };
}
