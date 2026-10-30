import SwiftUI

@main
public struct HimVoteApp: App {
    @State private var authViewModel = AuthViewModel()
    @State private var electionsViewModel = ElectionsViewModel()
    
    public init() {}
    
    public var body: some Scene {
        WindowGroup {
            ContentView(
                authViewModel: authViewModel,
                electionsViewModel: electionsViewModel
            )
            .onOpenURL { url in
                handleIncomingUniversalLink(url: url)
            }
        }
    }
    
    private func handleIncomingUniversalLink(url: URL) {
        if url.scheme == "himvote" || url.host == "himvote.example.in" {
            NotificationCenter.default.post(
                name: Notification.Name("HimVoteBoothReturnNotification"),
                object: url
            )
        }
    }
}

public struct ContentView: View {
    @Bindable var authViewModel: AuthViewModel
    @Bindable var electionsViewModel: ElectionsViewModel
    
    public init(authViewModel: AuthViewModel, electionsViewModel: ElectionsViewModel) {
        self.authViewModel = authViewModel
        self.electionsViewModel = electionsViewModel
    }
    
    public var body: some View {
        MainTabView(
            authViewModel: authViewModel,
            electionsViewModel: electionsViewModel
        )
    }
}
