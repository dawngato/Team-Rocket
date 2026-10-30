// swift-tools-version: 6.0
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "HimVote",
    defaultLocalization: "en",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(
            name: "HimVoteKit",
            targets: ["HimVoteKit"]
        )
    ],
    targets: [
        .target(
            name: "HimVoteKit",
            path: "HimVote"
        ),
        .testTarget(
            name: "HimVoteTests",
            dependencies: ["HimVoteKit"],
            path: "HimVoteTests"
        )
    ]
)
