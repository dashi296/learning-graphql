import React, { Component, Fragment } from 'react'
import Users from './Users'
import { BrowserRouter, Switch, Route } from 'react-router-dom'
import AuthorizedUser from './AuthorizedUser'
import { gql } from 'apollo-boost'
import { withApollo } from 'react-apollo'

export const ROOT_QUERY = gql`
    query allUsers {
        totalUsers        
        allUsers { ...userInfo }
        me { ...userInfo }
    }

    fragment userInfo on User {
        githubLogin
        name
        avatar
    }
`

export const LISTEN_FOR_USERS = gql`
  subscription {
    newUser {
      githubLogin
      name
      avatar
    }
  }
`

class App extends Component {

  componentDidMount() {
    let { client } = this.props
    this.listenForUsers = client
      .subscribe({ query: LISTEN_FOR_USERS })
      .subscribe(({ data:{ newUser } }) => {
        const data = client.readQuery({ query: ROOT_QUERY })
        data.totalUsers += 1
        data.allUsers = [
          ...data.allUsers,
          newUser
        ]

        client.writeQuery({ query: ROOT_QUERY, data })
      })
  }

  componentWillUnmount() {
    this.listenForUsers.unsubscribe()
  }

  render() {
    return (
      <BrowserRouter>
        <Switch>
          <Route exact path="/" component={() =>
            <Fragment>
              <AuthorizedUser />
              <Users />
            </Fragment>
          } />
          <Route component={({ location }) => <h1>"{location.pathname}" not found</h1>} />
        </Switch>
      </BrowserRouter>
    )
  }
}


export default withApollo(App)