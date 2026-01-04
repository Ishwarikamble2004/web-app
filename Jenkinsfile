pipeline {
    agent any

    stages {
        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Run Tests') {
            steps {
                sh 'npm test'
            }
        }

        stage('Test Results') {
            steps {
                junit 'test-results.xml' // If using junit reporter
            }
        }
    }

    post {
        always {
            echo 'Pipeline completed'
        }
        success {
            echo 'All tests passed!'
        }
        failure {
            echo 'Some tests failed'
        }
    }
}