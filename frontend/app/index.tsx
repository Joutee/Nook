import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Link } from 'expo-router'

const Home = () => {
  return (
    <View>
      <Text>Home</Text>
      <Link href="/finance">Go to Finance</Link>
      <Link href="/chores">Go to Chores</Link>
      <Link href="/flat">Go to Flat</Link>
      <Link href="/settings">Go to Settings</Link>
    </View>
  )
}

export default Home

const styles = StyleSheet.create({})